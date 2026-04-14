export function toPascalCase(input: string): string {
  const words = splitWords(input);
  return words.map(capitalize).join("") || "Default";
}

export function toCamelCase(input: string): string {
  const words = splitWords(input);
  if (words.length === 0) {
    return "unnamedMethod";
  }

  return [
    words[0]!.toLowerCase(),
    ...words.slice(1).map(capitalize)
  ].join("");
}

export function deriveResourceName(pathname: string): string {
  const segments = pathname
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter((segment) => !segment.startsWith("{"));

  return toPascalCase(segments[0] ?? "default");
}

export function deriveOperationId(method: string, pathname: string): string {
  const pathWords = pathname
    .replace(/[{}]/g, "")
    .split("/")
    .filter(Boolean)
    .map((segment) => segment.replace(/[^a-zA-Z0-9]+/g, " "))
    .join(" ");

  return toCamelCase(`${method} ${pathWords}`) || `${method}Root`;
}

function splitWords(input: string): string[] {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.toLowerCase());
}

function capitalize(input: string): string {
  return input.charAt(0).toUpperCase() + input.slice(1).toLowerCase();
}
