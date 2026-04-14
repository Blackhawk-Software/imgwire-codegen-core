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

const SERVER_TARGETS = new Set<SDKTarget>([
  "node",
  "python",
  "ruby",
  "c-sharp",
  "java",
  "go",
  "rust"
]);

export function targetSupportsServerAuth(target: SDKTarget): boolean {
  return SERVER_TARGETS.has(target);
}
