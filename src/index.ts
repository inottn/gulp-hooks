import match from 'gulp-match';
import through2 from 'through2';
import type { MatchCondition } from 'gulp-match';
import type File from 'vinyl';

type ProcessFileFn = <T = File>(file: T, extraParams?: any) => T | Promise<T>;
type ConditionType = MatchCondition;
type NormalizedHookType = { condition: ConditionType; fn: ProcessFileFn };
type NormalizedHooksType = NormalizedHookType[];

export type HookType =
  | ProcessFileFn
  | { condition?: ConditionType; fn: ProcessFileFn };
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

export const registerHooks = (name: string, newHooks: HookType | HooksType) => {
  if (!newHooks) return;

  const hooks = HooksMap.get(name) ?? [];

  hooks.push(...normalizeHooks(newHooks));
  HooksMap.set(name, hooks);
};

export default (name: string, extraParams?: any) => {
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
          if (result) file = result;
        }
      }
    } catch (err) {
      cb(err);
    }

    cb(null, file);
  });
};
