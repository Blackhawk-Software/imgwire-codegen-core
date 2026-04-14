import type {
  BuildConfig,
  OpenAPIOperation,
  OpenAPISpec,
  SDK,
  SDKMethod
} from "../types.js";

import {
  extractRequestSchema,
  extractResponseSchema
} from "../utils/schema-ref.js";
import { deriveResourceName, toCamelCase } from "../utils/naming.js";
import { getOperations } from "../utils/openapi.js";
import { BuildError } from "../utils/errors.js";

export function buildIR(spec: OpenAPISpec, config: BuildConfig): SDK {
  const methodsByResource = new Map<string, SDKMethod[]>();

  for (const { path, method, operation } of getOperations(spec)) {
    if (operation["x-codegen-sdk-ignore"] === true) {
      continue;
    }

    validateExtension(
      operation,
      "x-codegen-sdk-auth",
      ["server_key", "client_key", "server_or_client_key"],
      config,
      path
    );
    validateExtension(
      operation,
      "x-codegen-sdk-pagination",
      ["offset_headers", "offset_pagination"],
      config,
      path
    );
    validateExtension(
      operation,
      "x-codegen-sdk-stability",
      ["stable", "beta", "internal", "deprecated"],
      config,
      path
    );

    const auth = getExtensionValue(
      operation,
      "x-codegen-sdk-auth",
      ["server_key", "client_key", "server_or_client_key"],
      "server_or_client_key"
    );
    const pagination = getExtensionValue(
      operation,
      "x-codegen-sdk-pagination",
      ["offset_headers", "offset_pagination"],
      undefined
    );
    const stability = getExtensionValue(
      operation,
      "x-codegen-sdk-stability",
      ["stable", "beta", "internal", "deprecated"],
      undefined
    );

    const resourceName = resolveResourceName(path, operation);
    const sdkMethod: SDKMethod = {
      name: toCamelCase(
        operation["x-codegen-sdk-method-name"] ?? operation.operationId ?? ""
      ),
      operationId: operation.operationId ?? "",
      http: {
        method,
        path
      },
      auth: auth ?? "server_or_client_key",
      pagination,
      stability,
      request: extractRequestSchema(operation),
      response: extractResponseSchema(operation),
      tags: [...(operation.tags ?? [])],
      sourceOperation: operation,
      resourceName
    };

    const resourceMethods = methodsByResource.get(resourceName) ?? [];
    resourceMethods.push(sdkMethod);
    methodsByResource.set(resourceName, resourceMethods);
  }

  return {
    resources: [...methodsByResource.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, methods]) => ({
        name,
        methods: methods.sort((left, right) => {
          const leftKey = `${left.http.path}:${left.http.method}:${left.name}`;
          const rightKey = `${right.http.path}:${right.http.method}:${right.name}`;
          return leftKey.localeCompare(rightKey);
        })
      }))
  };
}

function resolveResourceName(
  path: string,
  operation: OpenAPIOperation
): string {
  const explicitGroup = operation["x-codegen-sdk-group-name"];
  const tagGroup = operation.tags?.[0];

  return deriveResourceName(explicitGroup ?? tagGroup ?? path);
}

function validateExtension(
  operation: OpenAPIOperation,
  extensionKey:
    | "x-codegen-sdk-auth"
    | "x-codegen-sdk-pagination"
    | "x-codegen-sdk-stability",
  allowedValues: string[],
  config: BuildConfig,
  path: string
): void {
  const value = operation[extensionKey];
  if (value === undefined) {
    return;
  }

  if (typeof value === "string" && allowedValues.includes(value)) {
    return;
  }

  if (config.strict) {
    throw new BuildError(
      `Invalid ${extensionKey} value on ${path}: ${JSON.stringify(value)}.`
    );
  }
}

function getExtensionValue<const TValue extends string>(
  operation: OpenAPIOperation,
  extensionKey:
    | "x-codegen-sdk-auth"
    | "x-codegen-sdk-pagination"
    | "x-codegen-sdk-stability",
  allowedValues: readonly TValue[],
  fallback: TValue | undefined
): TValue | undefined {
  const value = operation[extensionKey];
  if (typeof value === "string" && allowedValues.includes(value as TValue)) {
    return value as TValue;
  }

  return fallback;
}
