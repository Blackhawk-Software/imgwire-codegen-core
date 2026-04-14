import type { HttpMethod, SDKTarget } from "../types.js";

export const HTTP_METHODS: HttpMethod[] = [
  "delete",
  "get",
  "head",
  "options",
  "patch",
  "post",
  "put",
  "trace"
];

const SERVER_TARGETS = new Set<SDKTarget>(["node"]);

export function targetSupportsServerAuth(target: SDKTarget): boolean {
  return SERVER_TARGETS.has(target);
}
