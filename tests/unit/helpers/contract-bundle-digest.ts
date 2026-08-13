/**
 * Cross-platform contract-bundle digest helpers.
 *
 * Historical seals were computed on whichever line endings the sealer’s working
 * tree had (`core.autocrlf` / platform checkout). Verification must treat LF and
 * CRLF encodings of the same text as equivalent without rewriting checksums.json.
 */
import { createHash } from "node:crypto";

export function normalizeNewlinesToLf(buf: Buffer): Buffer {
  const text = buf.toString("utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return Buffer.from(text, "utf8");
}

export function newlinesToCrlf(buf: Buffer): Buffer {
  const lf = normalizeNewlinesToLf(buf);
  return Buffer.from(lf.toString("utf8").replace(/\n/g, "\r\n"), "utf8");
}

export function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

/** LF and CRLF digests of the same text payload. */
export function contractFileDigests(buf: Buffer): { lf: string; crlf: string } {
  const lfBuf = normalizeNewlinesToLf(buf);
  return { lf: sha256(lfBuf), crlf: sha256(newlinesToCrlf(lfBuf)) };
}

/**
 * True when `seal` matches the file under LF or CRLF encoding.
 * Also tries a single extra trailing LF (some seals hashed an extra EOF newline
 * that git’s text normalization later dropped from the blob).
 */
export function sealMatchesContractFile(buf: Buffer, seal: string): boolean {
  const lfBuf = normalizeNewlinesToLf(buf);
  const candidates = [lfBuf, Buffer.concat([lfBuf, Buffer.from("\n")])];
  for (const candidate of candidates) {
    if (sha256(candidate) === seal) return true;
    if (sha256(newlinesToCrlf(candidate)) === seal) return true;
  }
  return false;
}

export function bundleDigestFromChecksums(
  files: string[],
  checksums: Record<string, string>,
): string {
  const concat = files.map((f) => `${f}:${checksums[f]}`).join("\n") + "\n";
  return sha256(Buffer.from(concat, "utf8"));
}
