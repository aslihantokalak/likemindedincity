import { toMatchUser, validateSignup } from "../../src/domain/live/member";
import type { NewMember } from "../../src/domain/types";

const valid: NewMember = {
  firstName: "Elif", age: 29, province: "İstanbul", district: "Kadıköy", intent: "friendship",
  interests: ["hiking", "live music", "chess"], availability: ["thu_evening"], languages: ["Turkish"], tableSize: "medium",
};

test("valid sign-up passes and trims the name", () => {
  const r = validateSignup({ ...valid, firstName: "  Elif " }, true);
  expect(r).toEqual({ ok: true, member: { ...valid, firstName: "Elif" } });
});

test("needs consent", () =>
  expect(validateSignup(valid, false)).toMatchObject({ ok: false, errors: { consent: expect.any(String) } }));

test("needs 3 to 8 interests", () => {
  expect(validateSignup({ ...valid, interests: ["hiking"] }, true)).toMatchObject({ ok: false, errors: { interests: expect.any(String) } });
  expect(validateSignup({ ...valid, interests: [...Array(9)].map((_, i) => `i${i}`) }, true)).toMatchObject({ ok: false, errors: { interests: expect.any(String) } });
});

test("district must belong to province", () =>
  expect(validateSignup({ ...valid, district: "Çankaya" }, true)).toMatchObject({ ok: false, errors: { district: expect.any(String) } }));

test("age must be 18-99", () => {
  expect(validateSignup({ ...valid, age: 17 }, true).ok).toBe(false);
  expect(validateSignup({ ...valid, age: 100 }, true).ok).toBe(false);
});

test("empty input lists every required field", () => {
  const r = validateSignup({}, false);
  expect(r.ok).toBe(false);
  if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(
    ["age", "availability", "consent", "district", "firstName", "intent", "interests", "languages", "province", "tableSize"].sort());
});

test("idea over 200 characters is rejected", () =>
  expect(validateSignup({ ...valid, idea: "x".repeat(201) }, true)).toMatchObject({ ok: false, errors: { idea: expect.any(String) } }));

test("toMatchUser maps fields and never sets persona", () => {
  const u = toMatchUser({ ...valid, id: "m1", createdAt: "2026-10-19T06:00:00.000Z", book: "Huzur", profession: "Editor", school: "METU" });
  expect(u).toMatchObject({
    id: "m1", name: "Elif", province: "İstanbul", district: "Kadıköy", books: ["Huzur"], authors: ["Ahmet Hamdi Tanpınar"],
    profession: "Editor", industry: "media", schools: ["METU"], groupSizePref: "medium", languages: ["Turkish"],
  });
  expect("persona" in u).toBe(false);
});

test("toMatchUser with free-text profession and unknown book", () => {
  const u = toMatchUser({ ...valid, id: "m2", createdAt: "2026-10-19T06:00:00.000Z", book: "Some zine", profession: "Potter" });
  expect(u).toMatchObject({ books: ["Some zine"], authors: [], profession: "Potter", industry: "", schools: [] });
});
