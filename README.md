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
import { postComment } from '@mixmaxhq/post-github-comment-from-travis';
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

## API

### `postComment(content, { ?auth, ?purpose, ?replace })`

Post a comment to the contextually relevant GitHub pull request.

- `content`: the GitHub-flavored markdown content to put in the comment
- `auth`: the optional authentication parameter to pass to `@octokit/rest` - will use the `GITHUB_TOKEN` environment variable if not provided
- `purpose`: a string signifying the comment's purpose - repeated calls with the same purpose on the same pull request will overwrite the prior comment
- `replace`: if `true` (and a `purpose` is provided), create a new comment and delete the old one instead of editing it. if `replace` is `force`, recreates the comment even if the content hasn't changed.

By default, will not edit/replace the comment if the `content` is the same as the existing comment.
