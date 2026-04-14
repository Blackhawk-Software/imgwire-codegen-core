import type { SDK } from "../types.js";

import { toCamelCase, toPascalCase } from "../utils/naming.js";

export function normalizeNames(sdk: SDK): SDK {
  return {
    resources: sdk.resources.map((resource) => ({
      ...resource,
      name: toPascalCase(resource.name),
      methods: resource.methods.map((method) => ({
        ...method,
        name: toCamelCase(method.name),
        resourceName: toPascalCase(resource.name)
      }))
    }))
  };
}
