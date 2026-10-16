import { AB_TEST, SURVEY, V1_COHORT } from "../data/analytics";

export function rate(part: number, whole: number): number {
  return whole === 0 ? 0 : part / whole;
}

/** 0.2301 → "23%" */
export function pct(r: number): string {
  return `${Math.round(r * 100)}%`;
}

type Proportion = { n: number; x: number };

/** 95% confidence interval for p(b) − p(a), normal approximation. */
export function diffCI95(a: Proportion, b: Proportion): { diff: number; low: number; high: number } {
  const p1 = rate(a.x, a.n), p2 = rate(b.x, b.n);
  const diff = p2 - p1;
  const se = Math.sqrt((p1 * (1 - p1)) / a.n + (p2 * (1 - p2)) / b.n);
  return { diff, low: diff - 1.96 * se, high: diff + 1.96 * se };
}

export function storyMetrics() {
  const { control, treatment } = AB_TEST;
  return {
    firstMeetupRate: rate(V1_COHORT.firstMeetup, V1_COHORT.matched),
    secondMeetupRateV1: rate(V1_COHORT.secondMeetup, V1_COHORT.matched),
    nothingInCommonRate: rate(SURVEY.nothingInCommon, SURVEY.responses),
    abControlRate: rate(control.secondMeetup, control.users),
    abTreatmentRate: rate(treatment.secondMeetup, treatment.users),
    abCI: diffCI95({ n: control.users, x: control.secondMeetup }, { n: treatment.users, x: treatment.secondMeetup }),
    onboardingControl: rate(control.onboardingCompleted, control.users),
    onboardingTreatment: rate(treatment.onboardingCompleted, treatment.users),
  };
}
