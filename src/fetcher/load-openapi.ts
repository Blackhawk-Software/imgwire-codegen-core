import { readFile } from "node:fs/promises";

import type { OpenAPISpec } from "../types.js";

import { cloneJson } from "../utils/clone.js";
import { BuildError } from "../utils/errors.js";

export async function loadOpenApi(
  source: string | OpenAPISpec
): Promise<OpenAPISpec> {
  if (typeof source !== "string") {
    return cloneJson(source);
  }

  if (/^https?:\/\//.test(source)) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new BuildError(
        `Failed to fetch OpenAPI spec: ${response.status} ${response.statusText}`
      );
    }

    return parseOpenApi(await response.text(), source);
  }

  const raw = await readFile(source, "utf8");
  return parseOpenApi(raw, source);
}

function parseOpenApi(raw: string, sourceLabel: string): OpenAPISpec {
  try {
    return JSON.parse(raw) as OpenAPISpec;
  } catch (error) {
    throw new BuildError(
      `Unable to parse OpenAPI source "${sourceLabel}". Only JSON sources are supported.`
    );
  }
}
