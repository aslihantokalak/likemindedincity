// Raw counts only. Every percentage shown on the site is computed from these by src/domain/metrics.ts.

/** v1 matching, users matched into a first group. */
export const V1_COHORT = { matched: 4200, firstMeetup: 2982, secondMeetup: 966 };

/** Post-event survey: "we had nothing in common". */
export const SURVEY = { responses: 1500, nothingInCommon: 870 };

/** Match Quality v1 (control) vs v2 (treatment). */
export const AB_TEST = {
  control: { users: 1200, onboardingCompleted: 936, secondMeetup: 276 },
  treatment: { users: 1200, onboardingCompleted: 900, secondMeetup: 372 },
};

export const ACTIVE_USERS = 6000;
export const TARGET_SECOND_MEETUP_RATE = 0.35;
