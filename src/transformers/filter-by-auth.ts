import type { SDK, SDKTarget } from "../types.js";

import { targetSupportsServerAuth } from "../utils/constants.js";

export function filterByAuth(sdk: SDK, target: SDKTarget): SDK {
  const supportsServerAuth = targetSupportsServerAuth(target);

  return {
    resources: sdk.resources
      .map((resource) => ({
        ...resource,
        methods: resource.methods.filter((method) => {
          if (method.auth === "server_or_client_key") {
            return true;
          }

          if (method.auth === "server_key") {
            return supportsServerAuth;
          }

          return !supportsServerAuth;
        })
      }))
      .filter((resource) => resource.methods.length > 0)
  };
}
