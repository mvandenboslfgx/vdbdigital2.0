import { resolveAppUrl } from "@/lib/url/app-url";

export function isValidRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const appOrigin = new URL(resolveAppUrl()).origin;
    return parsed.origin === appOrigin;
  } catch {
    return false;
  }
}
