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
  | "node"
  | "python"
  | "go"
  | "ruby"
  | "java"
  | "csharp"
  | "ios"
  | "android";

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
npm install
```

Build the package:

```bash
npm run build
```

Run tests:

```bash
npm test
```

## Current Scope

This package is focused on deterministic OpenAPI shaping only. It does not run OpenAPI Generator, post-process generated SDK code, or handle publishing workflows.
