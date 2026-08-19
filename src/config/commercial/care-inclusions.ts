/**
 * Care package commercial inclusions.
 * Values marked `needsBusinessDecision: true` must not be invented or shown as final.
 */

export type CareInclusionValue = boolean | "needs_business_decision";

export interface CareInclusionMatrix {
  hostingIncluded: CareInclusionValue;
  monitoring: CareInclusionValue;
  backups: CareInclusionValue;
  securityUpdates: CareInclusionValue;
  softwareUpdates: CareInclusionValue;
  changeHoursPerMonth: number | "needs_business_decision";
  rolloverMonths: number | "needs_business_decision";
  maxRolloverHours: number | "needs_business_decision" | null;
  responseTarget: string | "needs_business_decision";
  emergencySupport: CareInclusionValue;
  supportChannels: string[] | "needs_business_decision";
  explicitlyExcluded: string[];
  minimumContractTerm: string | "needs_business_decision" | null;
  cancellationTerms: string | "needs_business_decision" | null;
  fairUseTerms: string | "needs_business_decision" | null;
}

const UNDECIDED: CareInclusionMatrix = {
  hostingIncluded: "needs_business_decision",
  monitoring: "needs_business_decision",
  backups: "needs_business_decision",
  securityUpdates: "needs_business_decision",
  softwareUpdates: "needs_business_decision",
  changeHoursPerMonth: "needs_business_decision",
  rolloverMonths: "needs_business_decision",
  maxRolloverHours: "needs_business_decision",
  responseTarget: "needs_business_decision",
  emergencySupport: "needs_business_decision",
  supportChannels: "needs_business_decision",
  explicitlyExcluded: [],
  minimumContractTerm: "needs_business_decision",
  cancellationTerms: "needs_business_decision",
  fairUseTerms: "needs_business_decision",
};

/** Only fields explicitly recorded in care-packages.ts config are set; rest TBD */
export const careInclusionMatrix: Record<
  "essential" | "business" | "growth" | "partner",
  CareInclusionMatrix
> = {
  essential: {
    ...UNDECIDED,
    changeHoursPerMonth: 0,
    rolloverMonths: 0,
    maxRolloverHours: 0,
  },
  business: {
    ...UNDECIDED,
    changeHoursPerMonth: 1,
    rolloverMonths: 1,
    maxRolloverHours: "needs_business_decision",
  },
  growth: {
    ...UNDECIDED,
    changeHoursPerMonth: 3,
    rolloverMonths: 1,
    maxRolloverHours: "needs_business_decision",
  },
  partner: {
    ...UNDECIDED,
    changeHoursPerMonth: "needs_business_decision",
    rolloverMonths: 0,
    maxRolloverHours: null,
  },
};

export function hasUndecidedCareTerms(
  pkg: keyof typeof careInclusionMatrix,
): boolean {
  const matrix = careInclusionMatrix[pkg];
  return Object.values(matrix).some(
    (v) => v === "needs_business_decision" || (Array.isArray(v) && v.length === 0),
  );
}
