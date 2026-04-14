import type {
  HttpMethod,
  OpenAPIOperation,
  OpenAPIPathItem,
  OpenAPISpec
} from "../types.js";

import { HTTP_METHODS } from "./constants.js";

export function getOperations(
  spec: OpenAPISpec
): Array<{
  path: string;
  method: HttpMethod;
  operation: OpenAPIOperation;
  pathItem: OpenAPIPathItem;
}> {
  const entries: Array<{
    path: string;
    method: HttpMethod;
    operation: OpenAPIOperation;
    pathItem: OpenAPIPathItem;
  }> = [];

  for (const path of Object.keys(spec.paths).sort()) {
    const pathItem = spec.paths[path]!;
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (operation) {
        entries.push({ path, method, operation, pathItem });
      }
    }
  }

  return entries;
}
