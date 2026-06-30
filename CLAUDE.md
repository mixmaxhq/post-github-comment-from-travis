# post-github-comment-from-travis — repo card

> A map, not a manual. Keep it ~1 screen; point to detail, don't inline it.

## What it is
Frozen npm library (`@mixmaxhq/post-github-comment-from-travis`) that posts a comment to the relevant GitHub PR thread when invoked inside a Travis CI PR build. Exposes both a JS API (`postComment`) and a CLI binary. No active development — published and stable.

## serves
role: CI PR-comment utility — lets other repos' Travis builds annotate PRs with automated messages (e.g. bundle-size diffs, lockfile line counts)
referenced-by: [any Mixmax repo that calls `postComment` or the CLI in its Travis build steps]

## Code map
- Library entry  -> `src/index.js` (exports `postComment`)
- Core logic     -> `src/commenter.js` (octokit-based create/edit/replace)
- CLI binary     -> `bin/src/` (yargs wrapper around `postComment`, built to `bin/`)
- Build output   -> `dist/` (transpiled library), `bin/*.js` (transpiled CLI)

## Conventions
- ES modules in `src/`, transpiled to CommonJS via Babel for the published `dist/`
- Auth defaults to `GITHUB_TOKEN` env var; Travis CI env vars supply repo/PR context via `@mixmaxhq/travis-utils`
- `purpose` string acts as a dedup key — repeated calls overwrite the previous comment on the same PR

## Gotchas
- **Frozen repo** — no tests exist (`test` script exits 1). Do not add features; prefer forking if behaviour changes are needed.
- Package attaches `Symbol.asyncIterator` polyfill globally; document this if consumers are sensitive to prototype mutation.
- Only works inside a Travis CI PR build (reads `TRAVIS_*` env vars via `@mixmaxhq/travis-utils`); calling locally will fail without those vars set.

## Run / test
```sh
npm run build        # babel transpile src/ → dist/ and bin/src/ → bin/
npm run lint         # eslint (only CI check)
# publish (from maintainer machine):
npm publish          # runs prepublishOnly (build) then publishes to npm
```

## Load the matching domain card
This repo is cross-cutting tooling — it owns no product domain, so there is no domain card to load. When working here, load the card of the consuming service/domain if the change is driven by its needs.
