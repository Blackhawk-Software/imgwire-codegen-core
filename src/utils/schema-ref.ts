import type { OpenAPIOperation, SchemaRef } from "../types.js";

export function extractRequestSchema(operation: OpenAPIOperation): SchemaRef {
  const requestBody = operation.requestBody;
  if (!requestBody || typeof requestBody !== "object") {
    return null;
  }

  const content = getContentMap(requestBody);
  const contentTypes = Object.keys(content).sort();
  const firstMediaType = contentTypes[0];

  if (!firstMediaType) {
    return {
      type: "requestBody",
      contentTypes: []
    };
  }

  return {
    type: "requestBody",
    ref: extractRef(content[firstMediaType]),
    contentTypes
  };
}

export function extractResponseSchema(operation: OpenAPIOperation): SchemaRef {
  const responses = operation.responses;
  if (!responses || typeof responses !== "object") {
    return null;
  }

  const statusCode = pickResponseStatusCode(responses);
  if (!statusCode) {
    return {
      type: "response",
      contentTypes: []
    };
  }

  const response = responses[statusCode];
  const content = getContentMap(response);
  const contentTypes = Object.keys(content).sort();
  const firstMediaType = contentTypes[0];

  return {
    type: "response",
    statusCode,
    ref: firstMediaType ? extractRef(content[firstMediaType]) : undefined,
    contentTypes
  };
}

function pickResponseStatusCode(
  responses: Record<string, unknown>
): string | undefined {
  return Object.keys(responses)
    .sort((left, right) => {
      const leftNumeric = Number.parseInt(left, 10);
      const rightNumeric = Number.parseInt(right, 10);

      if (Number.isNaN(leftNumeric) || Number.isNaN(rightNumeric)) {
        return left.localeCompare(right);
      }

      return leftNumeric - rightNumeric;
    })
    .find(() => true);
}

function getContentMap(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const content = (value as { content?: unknown }).content;
  if (!content || typeof content !== "object") {
    return {};
  }

  return content as Record<string, unknown>;
}

function extractRef(mediaType: unknown): string | undefined {
  if (!mediaType || typeof mediaType !== "object") {
    return undefined;
  }

  const schema = (mediaType as { schema?: unknown }).schema;
  if (!schema || typeof schema !== "object") {
    return undefined;
  }

  const ref = (schema as { $ref?: unknown }).$ref;
  return typeof ref === "string" ? ref : undefined;
}
