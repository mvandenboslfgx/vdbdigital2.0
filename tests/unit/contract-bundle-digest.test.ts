import { describe, expect, it } from "vitest";
import {
  bundleDigestFromChecksums,
  contractFileDigests,
  normalizeNewlinesToLf,
  newlinesToCrlf,
  sealMatchesContractFile,
  sha256,
} from "./helpers/contract-bundle-digest";

describe("contract-bundle-digest", () => {
  const payload = "alpha\nbeta\n";

  it("LF and CRLF inputs share the same LF digest", () => {
    const lf = Buffer.from(payload, "utf8");
    const crlf = newlinesToCrlf(lf);
    expect(crlf.includes(0x0d)).toBe(true);
    expect(contractFileDigests(lf).lf).toBe(contractFileDigests(crlf).lf);
    expect(contractFileDigests(lf).crlf).toBe(contractFileDigests(crlf).crlf);
  });

  it("sealMatchesContractFile accepts either historical EOL form", () => {
    const lf = Buffer.from(payload, "utf8");
    const crlf = newlinesToCrlf(lf);
    const { lf: lfSeal, crlf: crlfSeal } = contractFileDigests(lf);

    expect(sealMatchesContractFile(lf, lfSeal)).toBe(true);
    expect(sealMatchesContractFile(crlf, lfSeal)).toBe(true);
    expect(sealMatchesContractFile(lf, crlfSeal)).toBe(true);
    expect(sealMatchesContractFile(crlf, crlfSeal)).toBe(true);
    expect(sealMatchesContractFile(lf, sha256(Buffer.from("other\n")))).toBe(
      false,
    );
  });

  it("sealMatchesContractFile tolerates an extra trailing newline used at seal time", () => {
    const committed = Buffer.from("row\n", "utf8");
    const sealedCrlf = newlinesToCrlf(
      Buffer.concat([normalizeNewlinesToLf(committed), Buffer.from("\n")]),
    );
    expect(sealMatchesContractFile(committed, sha256(sealedCrlf))).toBe(true);
  });

  it("bundleDigestFromChecksums is stable for the recorded checksum map", () => {
    const files = ["a.json", "b.json"];
    const checksums = { "a.json": "aa", "b.json": "bb" };
    expect(bundleDigestFromChecksums(files, checksums)).toBe(
      sha256(Buffer.from("a.json:aa\nb.json:bb\n", "utf8")),
    );
  });
});
