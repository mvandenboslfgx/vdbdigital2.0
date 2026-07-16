import "server-only";
import { createHmac } from "crypto";

/** HMAC SHA256 hash voor tawk.to Secure Mode (email identificatie) */
export function generateTawkVisitorHash(email: string, apiSecret: string): string {
  return createHmac("sha256", apiSecret).update(email.trim().toLowerCase()).digest("hex");
}
