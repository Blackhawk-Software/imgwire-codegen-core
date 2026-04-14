# AGENTS.md

This repository contains `imgwire-codegen-core`, a small TypeScript package that transforms raw OpenAPI specs into deterministic SDK-optimized OpenAPI output.

## Primary Goal

Future changes should preserve this package's role as a shared shaping layer for SDK generation. Keep the package focused on:

- loading OpenAPI input
- normalizing the document
- building SDK-oriented IR
- applying deterministic shaping transforms
- validating the transformed result
- emitting SDK-optimized OpenAPI

Do not expand the package into code generation, SDK publishing, or generated-code post-processing unless the user explicitly asks for that scope change.

## Current Architecture

The main entry point is [`src/index.ts`](./src/index.ts). The pipeline is:

1. `fetcher/load-openapi.ts`
2. `normalizer/normalize-openapi.ts`
3. `ir/build-ir.ts`
4. `transformers/*`
5. `validators/validate-sdk.ts`
6. `emitter/emit-openapi.ts`

Supporting utilities live under `src/utils/`.

## Key Implementation Assumptions

- Input parsing is currently JSON-only. Local files and remote URLs are expected to contain JSON.
- Client targets are currently:
  - `js`
  - `react`
  - `react-native`
  - `ios`
  - `android`
- Server targets are currently:
  - `node`
  - `python`
  - `ruby`
  - `c-sharp`
  - `java`
  - `go`
  - `rust`
- Determinism matters more than cleverness. Stable ordering should be preserved for paths, tags, methods, and object keys.
- Unknown vendor extensions should generally be ignored unless the requested change says otherwise.
- Supported vendor extensions today are:
  - `x-codegen-sdk-group-name`
  - `x-codegen-sdk-method-name`
  - `x-codegen-sdk-ignore`
  - `x-codegen-sdk-auth`
  - `x-codegen-sdk-pagination`
  - `x-codegen-sdk-stability`
- `x-codegen-sdk-auth` currently uses these values:
  - `server_key`
  - `client_key`
  - `server_or_client_key`
- Pagination input currently accepts both `offset_pagination` and the legacy `offset_headers` marker. Emitted specs normalize to `offset_pagination`.
- Paginated operations should emit the imgwire pagination response headers on successful responses:
  - `X-Total-Count`
  - `X-Page`
  - `X-Limit`
  - `X-Prev-Page`
  - `X-Next-Page`

## Change Guidelines

- Prefer extending the existing pipeline stages over adding ad hoc logic in `src/index.ts`.
- Keep transforms pure where possible: accept IR, return IR.
- Preserve deterministic output. If you add new collections, sort them before emission.
- If you change naming, filtering, or grouping behavior, update tests to lock the behavior down.
- Keep exported types in `src/types.ts` coherent with the public API.
- Avoid introducing runtime dependencies unless there is a clear payoff.

## Testing Expectations

- Run `yarn test` after meaningful code changes.
- Add or update tests in `tests/build-sdk-spec.test.ts` when changing shaping behavior.
- Prefer focused behavioral tests over broad snapshots unless snapshots clearly improve signal.

## Debugging

`buildSdkSpec(..., { config: { debug: true } })` writes intermediate JSON artifacts into `.imgwire-codegen-core-debug/` and logs pipeline steps to stderr.

## Documentation

If the public API, supported extensions, or repo workflow changes, update `README.md` alongside the code change.
