import type { Messages } from "./messages/en";

export type NestedValue = string | { [key: string]: NestedValue };

export function getPath(obj: NestedValue, path: string): string | undefined {
  const parts = path.split(".");
  let current: NestedValue | undefined = obj;
  for (const part of parts) {
    if (current === undefined || typeof current === "string") return undefined;
    current = current[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function createT(messages: Messages) {
  return function t(
    key: string,
    vars?: Record<string, string | number>,
  ): string {
    let value = getPath(messages as unknown as NestedValue, key) ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        value = value.replaceAll(`{${k}}`, String(v));
      }
    }
    return value;
  };
}

export type TranslateFn = ReturnType<typeof createT>;
