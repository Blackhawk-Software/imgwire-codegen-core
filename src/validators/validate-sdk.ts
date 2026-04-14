import type { SDK } from "../types.js";

import { BuildError } from "../utils/errors.js";

export function validateSdk(sdk: SDK): void {
  const seenOperationIds = new Set<string>();

  for (const resource of sdk.resources) {
    if (!resource.name) {
      throw new BuildError("SDK resource is missing a name.");
    }

    for (const method of resource.methods) {
      if (!method.name) {
        throw new BuildError(`SDK method on ${resource.name} is missing a name.`);
      }

      const emittedOperationId = `${resource.name}_${method.name}`;
      if (seenOperationIds.has(emittedOperationId)) {
        throw new BuildError(`Duplicate emitted operationId detected: ${emittedOperationId}`);
      }

      seenOperationIds.add(emittedOperationId);

      if (method.pagination && method.pagination !== "offset_headers") {
        throw new BuildError(`Unsupported pagination mode on ${method.http.method} ${method.http.path}`);
      }
    }
  }
}
