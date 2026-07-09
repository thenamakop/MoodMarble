import type {
  DashboardCountValue,
  DashboardPrivacyState,
  DashboardScoreValue,
  DashboardThresholdReason,
} from "../../../../packages/shared";

export const DASHBOARD_PRIVACY_THRESHOLDS = Object.freeze({
  minimum_submissions: 5,
  minimum_members_for_precise_values: 5,
  minimum_hourly_submissions: 3,
});

const HIDDEN_PRIVACY_REASONS: DashboardThresholdReason[] = [
  "minimum_submissions",
  "minimum_hourly_submissions",
];

const DASHBOARD_REASON_ORDER: DashboardThresholdReason[] = [
  "minimum_submissions",
  "minimum_members_for_precise_values",
  "minimum_hourly_submissions",
];

export interface DashboardPrivacyWindowInput {
  totalSubmissions: number;
  teamMemberCount: number;
}

export interface DashboardPrivacyHourInput extends DashboardPrivacyWindowInput {
  hourSubmissions: number;
}

export function getDashboardWindowPrivacy(
  input: DashboardPrivacyWindowInput,
): DashboardPrivacyState {
  const reasons: DashboardThresholdReason[] = [];

  if (input.totalSubmissions < DASHBOARD_PRIVACY_THRESHOLDS.minimum_submissions) {
    reasons.push("minimum_submissions");
  }

  if (input.teamMemberCount < DASHBOARD_PRIVACY_THRESHOLDS.minimum_members_for_precise_values) {
    reasons.push("minimum_members_for_precise_values");
  }

  return createDashboardPrivacyState(reasons);
}

export function getDashboardHourPrivacy(input: DashboardPrivacyHourInput): DashboardPrivacyState {
  const reasons = [...getDashboardWindowPrivacy(input).reasons];

  if (input.hourSubmissions < DASHBOARD_PRIVACY_THRESHOLDS.minimum_hourly_submissions) {
    reasons.push("minimum_hourly_submissions");
  }

  return createDashboardPrivacyState(reasons);
}

export function toDashboardCountValue(
  count: number,
  privacy: DashboardPrivacyState,
): DashboardCountValue {
  if (privacy.visibility === "hidden") {
    return { kind: "hidden" };
  }

  if (privacy.visibility === "blurred") {
    return blurDashboardCount(count);
  }

  return {
    kind: "exact",
    value: sanitizeNonNegativeInteger(count),
  };
}

export function toDashboardScoreValue(
  score: number,
  privacy: DashboardPrivacyState,
): DashboardScoreValue {
  if (privacy.visibility === "hidden") {
    return { kind: "hidden" };
  }

  const clampedScore = clamp(score, 1, 9);

  if (privacy.visibility === "blurred") {
    const roundedScore = Math.round(clampedScore);

    return {
      kind: "range",
      min: clamp(roundedScore - 1, 1, 9),
      max: clamp(roundedScore + 1, 1, 9),
    };
  }

  return {
    kind: "exact",
    value: clampedScore,
  };
}

export function createDashboardPrivacyState(
  reasons: DashboardThresholdReason[],
): DashboardPrivacyState {
  const normalizedReasons = DASHBOARD_REASON_ORDER.filter((reason) => reasons.includes(reason));

  return {
    visibility: getDashboardVisibility(normalizedReasons),
    reasons: normalizedReasons,
    thresholds: DASHBOARD_PRIVACY_THRESHOLDS,
  };
}

function getDashboardVisibility(
  reasons: DashboardThresholdReason[],
): DashboardPrivacyState["visibility"] {
  if (reasons.some((reason) => HIDDEN_PRIVACY_REASONS.includes(reason))) {
    return "hidden";
  }

  if (reasons.includes("minimum_members_for_precise_values")) {
    return "blurred";
  }

  return "visible";
}

function blurDashboardCount(count: number): DashboardCountValue {
  const sanitizedCount = sanitizeNonNegativeInteger(count);

  if (sanitizedCount === 0) {
    return {
      kind: "range",
      min: 0,
      max: 1,
    };
  }

  if (sanitizedCount <= 2) {
    return {
      kind: "range",
      min: 1,
      max: 2,
    };
  }

  if (sanitizedCount <= 4) {
    return {
      kind: "range",
      min: 2,
      max: 4,
    };
  }

  const rangeMin = Math.floor((sanitizedCount - 5) / 5) * 5 + 5;

  return {
    kind: "range",
    min: rangeMin,
    max: rangeMin + 4,
  };
}

function sanitizeNonNegativeInteger(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.floor(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
