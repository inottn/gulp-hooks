<p align="center">
  <img alt="logo" src="https://fastly.jsdelivr.net/npm/@inottn/assets/gulp-hooks/logo.svg" width="420" style="margin-bottom: 10px;">
</p>

<p align="center">Execute injected hooks in the workflow of gulp.</p>

## Install

Using `pnpm` to install:

```bash
pnpm add gulp-hooks
```

Using `yarn` or `npm`:

```bash
# with yarn
yarn add gulp-hooks

# with npm
npm i gulp-hooks
```

## Usage

Starting from a simple example, if we need to add an updatedAt field to the json to indicate its update time, we can do it like this.

```js
import tapHooks, { registerHooks } from 'gulp-hooks';

registerHooks('compileJSON', (file) => {
  const json = JSON.parse(file.contents.toString());
  json.updatedAt = Date.now();
  file.contents = Buffer.from(JSON.stringify(json));
});

function task() {
  return gulp
    .src('**/*.json')
    .pipe(tapHooks('compileJSON'))
    .pipe(jsonmin())
    .pipe(gulp.dest('dist'));
}
```

The second argument passed to tapHooks will be received by the hook, and you can pass any value you need.

```js
registerHooks('compileJSON', (file, { version }) => {
  // ...
});

tapHooks('compileJSON', { version: 'v1.0.0' });
```

Sometimes, we may need to determine whether to execute the hook based on certain condition, which can be done.

```js
registerHooks('compileJSON', {
  condition: ['**/*.json'],
  fn: (file) => {
    // ...
  },
});

registerHooks('compileJSON', {
  condition: (file) => file.extname === '.json',
  fn: (file) => {
    // ...
  },
});
```

Of course, you can register multiple handlers function for the same hook.

```js
registerHooks('hookName', [
  (file) => {
    // ...
  },
  (file) => {
    // ...
  },
]);
```

If needed, you can also return a stream.

```js
registerHooks('compileJSON', (file) => {
  return jsonmin();
});
```
