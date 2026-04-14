import type { SDK } from "../types.js";

export function applyPagination(sdk: SDK): SDK {
  return {
    resources: sdk.resources.map((resource) => ({
      ...resource,
      methods: resource.methods.map((method) => ({
        ...method,
        pagination: method.pagination
      }))
    }))
  };
}
