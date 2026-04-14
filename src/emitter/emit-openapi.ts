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
      } else {
        delete operation["x-codegen-sdk-pagination"];
      }
      if (inclusion.stability) {
        operation["x-codegen-sdk-stability"] = inclusion.stability;
      } else {
        delete operation["x-codegen-sdk-stability"];
      }

      hasOperation = true;
    }

    if (hasOperation) {
      nextPaths[path] = pathItem;
    }
  }

  nextSpec.paths = nextPaths;
  nextSpec.tags = sdk.resources.map((resource) => ({ name: resource.name }));
  pruneUnusedSchemas(nextSpec);

  return sortKeysDeep(nextSpec);
}

function pruneUnusedSchemas(spec: OpenAPISpec): void {
  const components = spec.components;
  if (!components || typeof components !== "object") {
    return;
  }

  const allSchemas = getComponentSection(spec, "schemas");
  if (!allSchemas) {
    return;
  }

  const reachableRefs = collectReachableComponentRefs(spec.paths, spec);
  const reachableSchemaNames = [...reachableRefs]
    .filter((ref) => ref.startsWith("#/components/schemas/"))
    .map((ref) => ref.slice("#/components/schemas/".length));

  components.schemas = Object.fromEntries(
    Object.entries(allSchemas)
      .filter(([schemaName]) => reachableSchemaNames.includes(schemaName))
      .sort(([left], [right]) => left.localeCompare(right))
  );
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
    const existingHeaders = typedResponse.headers ?? {};

    typedResponse.headers = { ...existingHeaders };
    for (const [headerName, headerSchema] of Object.entries(
      PAGINATION_HEADERS
    )) {
      if (!typedResponse.headers[headerName]) {
        typedResponse.headers[headerName] = cloneJson(headerSchema);
      }
    }
  }
}

function isSuccessStatus(statusCode: string): boolean {
  return /^2\d\d$/.test(statusCode) || statusCode === "default";
}

function collectReachableComponentRefs(
  value: unknown,
  spec: OpenAPISpec,
  seenRefs = new Set<string>(),
  visitedValues = new WeakSet<object>()
): Set<string> {
  visitValue(value, spec, seenRefs, visitedValues);
  return seenRefs;
}

function visitValue(
  value: unknown,
  spec: OpenAPISpec,
  seenRefs: Set<string>,
  visitedValues: WeakSet<object>
): void {
  if (Array.isArray(value)) {
    for (const entry of value) {
      visitValue(entry, spec, seenRefs, visitedValues);
    }
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  if (visitedValues.has(value)) {
    return;
  }

  visitedValues.add(value);

  const ref = (value as { $ref?: unknown }).$ref;
  if (typeof ref === "string" && ref.startsWith("#/components/")) {
    if (!seenRefs.has(ref)) {
      seenRefs.add(ref);
      visitValue(resolveComponentRef(spec, ref), spec, seenRefs, visitedValues);
    }
  }

  for (const nestedValue of Object.values(value as Record<string, unknown>)) {
    visitValue(nestedValue, spec, seenRefs, visitedValues);
  }
}

function resolveComponentRef(spec: OpenAPISpec, ref: string): unknown {
  const parts = ref.replace(/^#\//, "").split("/");
  let current: unknown = spec;

  for (const part of parts) {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

function getComponentSection(
  spec: OpenAPISpec,
  section: string
): Record<string, unknown> | undefined {
  const components = spec.components;
  if (!components || typeof components !== "object") {
    return undefined;
  }

  const componentSection = (components as Record<string, unknown>)[section];
  if (!componentSection || typeof componentSection !== "object") {
    return undefined;
  }

  return componentSection as Record<string, unknown>;
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
