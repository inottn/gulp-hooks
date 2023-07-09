import { describe, expect, it, vi } from 'vitest';
import gulp from 'gulp';
import through2 from 'through2';
import tapHooks, { registerHooks, unregisterHooks } from '../src';

describe('gulp-hooks', () => {
  it('register hook and tap hook', () =>
    new Promise<void>((done) => {
      const updatedAt = Date.now();

      registerHooks('compileJSON', (file) => {
        if (!file.isBuffer()) return;
        const json = JSON.parse(file.contents.toString());
        json.updatedAt = updatedAt;
        file.contents = Buffer.from(JSON.stringify(json));
      });

      gulp
        .src('test/test.json')
        .pipe(tapHooks('compileJSON'))
        .pipe(
          through2.obj((file) => {
            const json = JSON.parse(file.contents.toString());
            expect(json.updatedAt).toBe(updatedAt);
            done();
          }),
        );

      unregisterHooks('compileJSON');
    }));

  it('register multiple handlers function for the same hook', () =>
    new Promise<void>((done) => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      registerHooks('compileJSON', [handler1, handler2]);

      gulp
        .src('test/test.json')
        .pipe(tapHooks('compileJSON'))
        .pipe(
          through2.obj(() => {
            expect(handler1).toBeCalledTimes(1);
            expect(handler2).toBeCalledTimes(1);
            done();
          }),
        );

      unregisterHooks('compileJSON');
    }));
});
