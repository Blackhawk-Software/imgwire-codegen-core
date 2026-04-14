import type { BuildConfig, OpenAPIParameter, OpenAPISpec } from "../types.js";

import { cloneJson } from "../utils/clone.js";
import { BuildError } from "../utils/errors.js";
import { deriveOperationId } from "../utils/naming.js";
import { getOperations } from "../utils/openapi.js";
import { sortKeysDeep } from "../utils/sort.js";

export function normalizeOpenApi(
  spec: OpenAPISpec,
  config: BuildConfig
): OpenAPISpec {
  const normalized = cloneJson(spec);

  if (!normalized.openapi) {
    throw new BuildError(
      "OpenAPI document is missing the top-level openapi field."
    );
  }

  if (!normalized.info?.title || !normalized.info?.version) {
    throw new BuildError(
      "OpenAPI document is missing required info.title or info.version."
    );
  }

  normalized.paths = normalized.paths ?? {};

  for (const { path, method, operation, pathItem } of getOperations(
    normalized
  )) {
    operation.operationId =
      operation.operationId ?? deriveOperationId(method, path);
    operation.tags = [
      ...new Set((operation.tags ?? []).filter(Boolean))
    ].sort();
    operation.parameters = normalizeParameters([
      ...(Array.isArray(pathItem.parameters) ? pathItem.parameters : []),
      ...(Array.isArray(operation.parameters) ? operation.parameters : [])
    ]);

    if (!operation.responses || typeof operation.responses !== "object") {
      handleInvalid(
        config,
        `Operation ${method.toUpperCase()} ${path} is missing responses.`
      );
      operation.responses = {};
    }
  }

  return sortKeysDeep(normalized);
}

function normalizeParameters(
  parameters: OpenAPIParameter[]
): OpenAPIParameter[] {
  const deduped = new Map<string, OpenAPIParameter>();

  for (const parameter of parameters) {
    const key = `${parameter.in}:${parameter.name}`;
    if (!deduped.has(key)) {
      deduped.set(key, parameter);
    }
  }

  return [...deduped.values()].sort((left, right) => {
    const leftKey = `${left.in}:${left.name}`;
    const rightKey = `${right.in}:${right.name}`;
    return leftKey.localeCompare(rightKey);
  });
}

function handleInvalid(config: BuildConfig, message: string): void {
  if (config.strict) {
    throw new BuildError(message);
  }
}
