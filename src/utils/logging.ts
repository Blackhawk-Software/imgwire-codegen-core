import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import type { BuildConfig } from "../types.js";

export function debugLog(config: BuildConfig, step: string, payload?: unknown): void {
  if (!config.debug) {
    return;
  }

  if (payload === undefined) {
    console.error(`[imgwire-codegen-core] ${step}`);
    return;
  }

  console.error(`[imgwire-codegen-core] ${step}`, payload);
}

export function writeDebugArtifact(
  config: BuildConfig,
  name: string,
  payload: unknown
): void {
  if (!config.debug) {
    return;
  }

  const outputDir = resolve(process.cwd(), ".imgwire-codegen-core-debug");
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(
    resolve(outputDir, `${name}.json`),
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8"
  );
}
