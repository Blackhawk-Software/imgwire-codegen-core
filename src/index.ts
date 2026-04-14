import { emitOpenApi } from "./emitter/emit-openapi.js";
import { loadOpenApi } from "./fetcher/load-openapi.js";
import { buildIR } from "./ir/build-ir.js";
import { normalizeOpenApi } from "./normalizer/normalize-openapi.js";
import type { BuildSdkSpecOptions, OpenAPISpec } from "./types.js";
import { debugLog, writeDebugArtifact } from "./utils/logging.js";
import {
  applyPagination,
  filterByAuth,
  groupResources,
  normalizeNames
} from "./transformers/index.js";
import { validateSdk } from "./validators/validate-sdk.js";

export type {
  BuildConfig,
  BuildSdkSpecOptions,
  OpenAPIOperation,
  OpenAPIPathItem,
  OpenAPISpec,
  SDK,
  SDKMethod,
  SDKResource,
  SDKTarget
} from "./types.js";

export async function buildSdkSpec(
  options: BuildSdkSpecOptions
): Promise<OpenAPISpec> {
  const config = options.config ?? {};

  debugLog(config, "loading-openapi");
  const rawSpec = await loadOpenApi(options.source);

  debugLog(config, "normalizing-openapi");
  const normalized = normalizeOpenApi(rawSpec, config);
  writeDebugArtifact(config, "normalized-openapi", normalized);

  debugLog(config, "building-ir");
  const sdk = buildIR(normalized, config);
  writeDebugArtifact(config, "sdk-ir-initial", sdk);

  debugLog(config, "transforming-ir");
  const authFiltered = filterByAuth(sdk, options.target);
  const regrouped = groupResources(authFiltered);
  const renamed = normalizeNames(regrouped);
  const transformed = applyPagination(renamed);

  const filteredInternal = config.includeInternal
    ? transformed
    : {
        resources: transformed.resources
          .map((resource) => ({
            ...resource,
            methods: resource.methods.filter(
              (method) => method.stability !== "internal"
            )
          }))
          .filter((resource) => resource.methods.length > 0)
      };

  validateSdk(filteredInternal);
  writeDebugArtifact(config, "sdk-ir-final", filteredInternal);

  debugLog(config, "emitting-openapi");
  const emitted = emitOpenApi(filteredInternal, normalized);
  writeDebugArtifact(config, "sdk-openapi", emitted);

  return emitted;
}
