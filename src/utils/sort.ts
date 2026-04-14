export function sortKeysDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => sortKeysDeep(entry)) as T;
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, nestedValue]) => [key, sortKeysDeep(nestedValue)]);

  return Object.fromEntries(entries) as T;
}
