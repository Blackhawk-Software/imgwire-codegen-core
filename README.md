# imgwire-codegen-core

`imgwire-codegen-core` is the shared TypeScript package that shapes raw OpenAPI specs into deterministic, SDK-optimized OpenAPI output for imgwire SDK generation.

## What It Does

The package implements a simple shaping pipeline:

1. Load an OpenAPI document from a file path, URL, or in-memory object.
2. Normalize the spec so operation IDs, tags, and parameters are consistent.
3. Build an internal SDK-focused representation of resources and methods.
4. Apply SDK shaping transforms such as auth filtering, grouping, naming, and pagination tagging.
5. Validate the transformed result.
6. Emit a deterministic OpenAPI document for downstream code generation.

## Public API

```ts
import { buildSdkSpec } from "@imgwire/codegen-core";

const spec = await buildSdkSpec({
  target: "node",
  source: "./openapi.json",
  config: {
    strict: true
  }
});
```

### `buildSdkSpec(options)`

```ts
type SDKTarget =
  | "js"
  | "react"
  | "react-native"
  | "node"
  | "python"
  | "go"
  | "ruby"
  | "java"
  | "c-sharp"
  | "ios"
  | "android"
  | "rust";

type BuildConfig = {
  includeInternal?: boolean;
  strict?: boolean;
  debug?: boolean;
};
```

Arguments:

- `target`: SDK target used for shaping decisions.
- `source`: local JSON file path, HTTP(S) URL, or in-memory OpenAPI object.
- `config.includeInternal`: keeps operations marked with `x-codegen-sdk-stability: internal`.
- `config.strict`: throws on invalid supported vendor extension values.
- `config.debug`: logs pipeline steps and writes intermediate artifacts to `.imgwire-codegen-core-debug/`.

## Supported Vendor Extensions

- `x-codegen-sdk-group-name`
- `x-codegen-sdk-method-name`
- `x-codegen-sdk-ignore`
- `x-codegen-sdk-auth`
- `x-codegen-sdk-pagination`
- `x-codegen-sdk-stability`

### Auth Values

`x-codegen-sdk-auth` currently supports:

- `server_key`
- `client_key`
- `server_or_client_key`

### Pagination

When `x-codegen-sdk-pagination` is set to `offset_pagination`, the emitted SDK-shaped OpenAPI operation is annotated as paginated and successful responses are extended with these headers:

- `X-Total-Count`
- `X-Page`
- `X-Limit`
- `X-Prev-Page`
- `X-Next-Page`

For backward compatibility, the older `offset_headers` value is still accepted on input and normalized to `offset_pagination` on output.

This package only shapes the OpenAPI contract. SDK conveniences such as `listPages()` async iterators should be generated downstream from the emitted pagination metadata.

## Package Structure

```text
src/
  emitter/
  fetcher/
  ir/
  normalizer/
  transformers/
  utils/
  validators/
tests/
```

## Local Development

Install dependencies:

```bash
yarn install
```

Build the package:

```bash
yarn build
```

Run tests:

```bash
yarn test
```

## Releases

Prepare a new release locally by updating `package.json`:

```bash
yarn release:prepare 0.2.0
```

Then commit the version bump, push it, and publish a GitHub release with tag `v0.2.0`.

GitHub Actions will publish the package to npm when a GitHub release is published, after:

- installing dependencies
- verifying that the GitHub tag matches `package.json`
- running `yarn test`

This repository is configured for npm trusted publishing with GitHub Actions OIDC, so the publish workflow should not use a long-lived npm automation token for `npm publish`.

Before the workflow can publish successfully, configure a trusted publisher for this package on npm:

- provider: GitHub Actions
- repository: this repository
- workflow filename: `release.yml`

If you use npm package settings hardening after setup, npm recommends restricting token-based publishing access once trusted publishing is verified.

## Current Scope

This package is focused on deterministic OpenAPI shaping only. It does not run OpenAPI Generator, post-process generated SDK code, or handle publishing workflows.
