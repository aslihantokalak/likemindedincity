import { storyMetrics, pct, rate } from "../../src/domain/metrics";
import { V1_COHORT, TARGET_SECOND_MEETUP_RATE } from "../../src/data/analytics";

const m = storyMetrics();

test("story figures match the spec", () => {
  expect(pct(m.firstMeetupRate)).toBe("71%");
  expect(pct(m.secondMeetupRateV1)).toBe("23%");
  expect(pct(m.nothingInCommonRate)).toBe("58%");
  expect(pct(m.abControlRate)).toBe("23%");
  expect(pct(m.abTreatmentRate)).toBe("31%");
  expect(Math.round((m.onboardingControl - m.onboardingTreatment) * 100)).toBe(3);
});

test("funnel is monotonic", () => {
  expect(V1_COHORT.secondMeetup).toBeLessThanOrEqual(V1_COHORT.firstMeetup);
  expect(V1_COHORT.firstMeetup).toBeLessThanOrEqual(V1_COHORT.matched);
});

test("A/B lift is significant and target is missed", () => {
  expect(m.abCI.low).toBeGreaterThan(0);
  expect(m.abCI.diff).toBeCloseTo(0.08, 5);
  expect(m.abTreatmentRate).toBeLessThan(TARGET_SECOND_MEETUP_RATE);
});

test("rate guards zero", () => expect(rate(5, 0)).toBe(0));
