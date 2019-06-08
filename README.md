# post-github-comment-from-travis

Post a comment to the appropriate pull request thread on GitHub when run in a pull request build on
GitHub.

Beware: this package will attach an `asyncIterator` property to `Symbol` if one does not exist, for
compatibility reasons. If you find this problematic, feel free to submit a pull request.

Should support Node 7.6+ (uses untranspiled `async` and `await`).

## Install

```sh
$ npm i -D '@mixmaxhq/post-github-comment-from-travis'
```

## Usage

```js
import postComment from '@mixmaxhq/post-github-comment-from-travis';
import pkg from './package.json';

const numDependencies = Object.keys(pkg.dependencies).length;
postComment(`there are now ${numDependencies} dependencies`, { purpose: 'dependency-count' }).then(
  (result) => console.log(result)
);
```

```sh
$ post-github-comment-from-travis --purpose package-tree-size
  <<< "there are now $(wc -l package-lock.json) lines in the lockfile"
```
