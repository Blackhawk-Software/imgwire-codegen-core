import type { SDK, SDKTarget } from "../types.js";

import { targetSupportsServerAuth } from "../utils/constants.js";

export function filterByAuth(sdk: SDK, target: SDKTarget): SDK {
  const supportsServerAuth = targetSupportsServerAuth(target);

  return {
    resources: sdk.resources
      .map((resource) => ({
        ...resource,
        methods: resource.methods.filter((method) => {
          if (method.auth === "both") {
            return true;
          }

          if (method.auth === "server") {
            return supportsServerAuth;
          }

          return !supportsServerAuth || target === "node";
        })
      }))
      .filter((resource) => resource.methods.length > 0)
  };
}
