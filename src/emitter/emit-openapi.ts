import type {
  OpenAPIHeader,
  OpenAPIOperation,
  OpenAPIResponse,
  OpenAPISpec,
  SDK,
  SDKMethod
} from "../types.js";

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
      pagination?: SDKMethod["pagination"];
      stability?: SDKMethod["stability"];
    }
  >();

  for (const resource of sdk.resources) {
    for (const method of resource.methods) {
      includedMethods.set(`${method.http.path}:${method.http.method}`, {
        operationId: `${resource.name}_${method.name}`,
        tag: resource.name,
        pagination: method.pagination,
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
      if (inclusion.pagination) {
        operation["x-codegen-sdk-pagination"] = "offset_pagination";
        injectPaginationHeaders(operation);
      }
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

function injectPaginationHeaders(operation: OpenAPIOperation): void {
  if (!operation.responses || typeof operation.responses !== "object") {
    return;
  }

  for (const [statusCode, response] of Object.entries(operation.responses)) {
    if (
      !isSuccessStatus(statusCode) ||
      !response ||
      typeof response !== "object"
    ) {
      continue;
    }

    const typedResponse = response as OpenAPIResponse;
    typedResponse.headers = {
      ...PAGINATION_HEADERS,
      ...(typedResponse.headers ?? {})
    };
  }
}

function isSuccessStatus(statusCode: string): boolean {
  return /^2\d\d$/.test(statusCode) || statusCode === "default";
}

const PAGINATION_HEADERS: Record<string, OpenAPIHeader> = {
  "X-Limit": {
    description: "The current item limit of this request.",
    schema: {
      type: "integer"
    }
  },
  "X-Next-Page": {
    description:
      "The page index of the next page relative to this request, null if on the last page.",
    schema: {
      type: ["integer", "null"]
    }
  },
  "X-Page": {
    description: "The current page index of this request. Pages are 1-indexed.",
    schema: {
      type: "integer"
    }
  },
  "X-Prev-Page": {
    description:
      "The page index of the previous page relative to this request, null if on the first page.",
    schema: {
      type: ["integer", "null"]
    }
  },
  "X-Total-Count": {
    description:
      "Total items available for this REST resource across all pages.",
    schema: {
      type: "integer"
    }
  }
};
