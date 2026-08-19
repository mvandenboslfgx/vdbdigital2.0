/**
 * JS mirror of policies.ts for the apply script (Node cannot require TS directly).
 */
const PERMANENT_BLOCK_SOURCE_NRS = new Set([
  57, 26, 27, 58, 24, 25, 54, 56, 22, 23, 20,
]);

const LEGACY_WINDOWS10_SOURCE_NRS = new Set([2, 5, 7, 21]);

const REVIEW_REQUIRED_SOURCE_NRS = new Set([19, 53, 55, 59, 60]);

const CURATED_PUBLIC_SOURCE_NRS = new Set([
  1, 3, 4, 6, 8, 9, 10, 12, 14, 15, 18, 52,
]);

function resolveDisposition(sourceNr) {
  if (PERMANENT_BLOCK_SOURCE_NRS.has(sourceNr)) return "ARCHIVED_MASTER_FIXLIST";
  if (LEGACY_WINDOWS10_SOURCE_NRS.has(sourceNr)) return "LEGACY_REQUEST_ONLY";
  if (REVIEW_REQUIRED_SOURCE_NRS.has(sourceNr)) return "CANDIDATE_REVIEW";
  if (CURATED_PUBLIC_SOURCE_NRS.has(sourceNr)) return "CURATED_PUBLIC_CANDIDATE";
  return "CANDIDATE_REVIEW";
}

module.exports = {
  PERMANENT_BLOCK_SOURCE_NRS,
  LEGACY_WINDOWS10_SOURCE_NRS,
  REVIEW_REQUIRED_SOURCE_NRS,
  CURATED_PUBLIC_SOURCE_NRS,
  resolveDisposition,
};
