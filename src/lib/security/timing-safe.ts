import "server-only";
import { timingSafeEqual } from "node:crypto";

/** Timing-safe vergelijking — voorkomt token timing attacks. */
export function timingSafeCompare(
  provided: string | null | undefined,
  expected: string | undefined,
): boolean {
  if (!expected || !provided) return false;
  try {
    const a = Buffer.from(provided, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
