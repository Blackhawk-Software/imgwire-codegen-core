import type { SDK } from "../types.js";

export function groupResources(sdk: SDK): SDK {
  const methodsByResource = new Map<string, typeof sdk.resources[number]["methods"]>();

  for (const resource of sdk.resources) {
    for (const method of resource.methods) {
      const bucket = methodsByResource.get(method.resourceName) ?? [];
      bucket.push(method);
      methodsByResource.set(method.resourceName, bucket);
    }
  }

  return {
    resources: [...methodsByResource.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, methods]) => ({
        name,
        methods: methods.sort((left, right) => left.name.localeCompare(right.name))
      }))
  };
}
