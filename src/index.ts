import BaseStream from 'node:stream';
import { withResolvers, isFunction, toArray } from '@inottn/fp-utils';
import match from 'gulp-match';
import through2 from 'through2';
import type { Transform } from 'node:stream';
import type { MatchCondition } from 'gulp-match';
import type File from 'vinyl';

type MaybePromise<T> = T | Promise<T>;
type ProcessFn = <T = File | Transform>(
  file: File,
  extraParams?: any,
) => MaybePromise<void | T>;
type ConditionType = MatchCondition;
type NormalizedHookType = { condition: ConditionType; fn: ProcessFn };
type NormalizedHooksType = NormalizedHookType[];

export type HookType = ProcessFn | { condition?: ConditionType; fn: ProcessFn };
export type HooksType = HookType[];

const HooksMap = new Map<string, NormalizedHooksType>();

const normalizeHook = (hook: HookType): NormalizedHookType => {
  if (typeof hook === 'function') return { condition: true, fn: hook };
  return { condition: true, ...hook };
};

const normalizeHooks = (hooks: HookType | HooksType): NormalizedHooksType => {
  if (Array.isArray(hooks)) return hooks.map(normalizeHook);
  return [normalizeHook(hooks)];
};

const transformStream = (stream: Transform, file: File) => {
  const { resolve, reject, promise } = withResolvers<File>();
  const resolveListener = () => resolve(file);

  stream.write(file);
  stream.once('data', resolveListener);
  stream.once('end', resolveListener);
  stream.once('error', reject);

  return promise;
};

export const registerHooks = (name: string, hooks: HookType | HooksType) => {
  if (!hooks) return;

  const existHooks = HooksMap.get(name) ?? [];

  existHooks.push(...normalizeHooks(hooks));
  HooksMap.set(name, existHooks);
};

export const unregisterHooks = (
  name?: string,
  hooks?: HookType | HooksType,
) => {
  if (!name) {
    HooksMap.clear();
    return;
  }

  if (!hooks) {
    HooksMap.delete(name);
    return;
  }

  if (!HooksMap.has(name)) return;

  const existHooks = HooksMap.get(name);

  HooksMap.set(
    name,
    existHooks.filter((existHook) => {
      return toArray(hooks).some((hook) =>
        isFunction(hook) ? hook === existHook.fn : hook.fn === existHook.fn,
      );
    }),
  );
};

export const tapHooks = (name: string, extraParams?: any) => {
  const hooks = HooksMap.get(name);

  return through2.obj(async (file: File, enc, cb) => {
    if (!hooks) {
      cb(null, file);
      return;
    }

    try {
      for (const hook of hooks) {
        const { fn } = hook;
        let { condition } = hook;

        if (typeof condition !== 'boolean') {
          condition = match(file, condition);
        }

        if (condition) {
          const result = await fn(file, extraParams);

          if (result) {
            file =
              result instanceof BaseStream
                ? await transformStream(result, file)
                : result;
          }
        }
      }
    } catch (err) {
      cb(err);
    }

    cb(null, file);
  });
};

export default tapHooks;
