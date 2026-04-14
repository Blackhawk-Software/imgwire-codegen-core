import type { OpenAPISpec, SDK, SDKMethod } from "../types.js";

import { cloneJson } from "../utils/clone.js";
import { HTTP_METHODS } from "../utils/constants.js";
import { sortKeysDeep } from "../utils/sort.js";

export function emitOpenApi(sdk: SDK, original: OpenAPISpec): OpenAPISpec {
  const nextSpec = cloneJson(original);
  const includedMethods = new Map<
    string,
    {
      operationId: string;
      tag: string;
      stability?: SDKMethod["stability"];
    }
  >();

  for (const resource of sdk.resources) {
    for (const method of resource.methods) {
      includedMethods.set(`${method.http.path}:${method.http.method}`, {
        operationId: `${resource.name}_${method.name}`,
        tag: resource.name,
        stability: method.stability
      });
    }
  }

  const nextPaths: OpenAPISpec["paths"] = {};

  for (const path of Object.keys(nextSpec.paths).sort()) {
    const pathItem = cloneJson(nextSpec.paths[path]!);
    let hasOperation = false;

    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation) {
        continue;
      }

      const inclusion = includedMethods.get(`${path}:${method}`);
      if (!inclusion) {
        delete pathItem[method];
        continue;
      }

      operation.operationId = inclusion.operationId;
      operation.tags = [inclusion.tag];
      if (inclusion.stability) {
        operation["x-codegen-sdk-stability"] = inclusion.stability;
      }

      hasOperation = true;
    }

    if (hasOperation) {
      nextPaths[path] = pathItem;
    }
  }

  nextSpec.paths = nextPaths;
  nextSpec.tags = sdk.resources.map((resource) => ({ name: resource.name }));

  return sortKeysDeep(nextSpec);
}
