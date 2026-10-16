import { checkPair, sharedSlots, topBlockingFilter, topBlockingFilterFor, distanceKm } from "../../src/domain/matching/filters";
import { mkUser } from "./helpers";

test("compatible pair passes", () => expect(checkPair(mkUser({ id: "a" }), mkUser({ id: "b" }))).toEqual({ ok: true }));

test("no shared slot fails availability", () =>
  expect(checkPair(mkUser({ availability: ["mon_morning"] }), mkUser({}))).toEqual({ ok: false, failed: "availability" }));

test("different intent fails", () =>
  expect(checkPair(mkUser({ intent: "networking" }), mkUser({}))).toEqual({ ok: false, failed: "intent" }));

test("age gap 13 fails", () =>
  expect(checkPair(mkUser({ age: 25 }), mkUser({ age: 38 }))).toEqual({ ok: false, failed: "age" }));

test("no common language fails", () =>
  expect(checkPair(mkUser({ languages: ["en"] }), mkUser({}))).toEqual({ ok: false, failed: "language" }));

test("far district fails distance", () =>
  expect(checkPair(mkUser({ coords: [41.0739, 28.2465] }), mkUser({}))).toEqual({ ok: false, failed: "distance" }));

test("Kadıköy to Beşiktaş is within range", () =>
  expect(distanceKm([40.9909, 29.0303], [41.0422, 29.0083])).toBeLessThan(12));

test("sharedSlots is the sorted intersection", () =>
  expect(sharedSlots([mkUser({ availability: ["thu_evening", "sat_morning"] }), mkUser({ availability: ["sat_morning", "thu_evening", "sun_afternoon"] })]))
    .toEqual(["sat_morning", "thu_evening"]));

test("topBlockingFilter names the dominant filter", () => {
  const us = [mkUser({ id: "a" }), mkUser({ id: "b", availability: ["mon_morning"] }), mkUser({ id: "c", availability: ["tue_evening"] })];
  expect(topBlockingFilter(us)).toBe("availability");
});

test("topBlockingFilterFor uses only the user's own pairs", () => {
  const lone = mkUser({ id: "x", availability: ["mon_morning"] });
  const others = [mkUser({ id: "a" }), mkUser({ id: "b", intent: "networking" }), mkUser({ id: "c", intent: "networking" })];
  expect(topBlockingFilterFor(lone, others)).toBe("availability");
});

test("topBlockingFilter is null when nothing blocks", () =>
  expect(topBlockingFilter([mkUser({ id: "a" }), mkUser({ id: "b" })])).toBeNull());
