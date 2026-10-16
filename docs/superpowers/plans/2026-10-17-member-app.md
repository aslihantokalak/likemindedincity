# Likeminded Member App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/join`: a member signs up (any Turkish province and district), is seated at a surprise table or put on a waitlist, can RSVP or decline, and can rate a past meetup; all data lives in the browser behind a swappable `Store`, seeded with ~300 demo members and their events.

**Architecture:** The existing matching engine gains a configurable location rule (`"distance"` for the simulator, `"province"` for the live app). New pure modules in `src/domain/live/` handle members, slots, venues and event seating. `src/store/` wraps `localStorage` behind a `Store` interface. A React island (`JoinApp`) on `src/pages/join.astro` renders form → table / waitlist → feedback. Demo data is generated deterministically by a script and committed with time offsets.

**Tech Stack:** Astro 7, React 19, TypeScript strict, Tailwind 4, Vitest 5, Playwright + axe (all already installed).

**Spec:** `docs/specs/2026-10-17-likeminded-live-prototype-design.md` (amends `docs/specs/2026-10-16-likeminded-portfolio-design.md`). This plan covers delivery step 1 (§9.1). Admin, Jira tools and case-study content get their own plans.

## Global Constraints

- UI copy in English; Turkish place names stay Turkish. No emoji anywhere in the UI.
- Visual language: existing tokens in `src/styles/global.css` (cream `--bg`, serif display headings, accent `#a63c26`), tap-to-select chips, soft rounded corners (`rounded-xl`/`rounded-full`).
- `src/domain/**` never imports from `src/components`, `src/pages`, `src/store`, React or Astro.
- Matching never reads `persona`; sensitive attributes are never collected (ADR-002).
- Deterministic: every domain function that depends on time takes `now: Date`; ids in domain functions come from an injected `newId` function; ties broken with `byString`.
- The Match Simulator and its 50 users keep using `locationRule: "distance"`; all existing tests keep passing unchanged except where a task says otherwise.
- Tests run with `TZ=Europe/Istanbul`.
- No real security claims: storage notice on the consent line is exactly "I understand this is a demo and my answers are stored only in this browser."
- `localStorage` keys are prefixed `likeminded:v1:`.

## Review Focus

1. **A member signs up in a province with no other members** (e.g. Van) → waitlist screen with "We need 3 more people in Van…", no crash. (Task 4 test)
2. **Corrupt, outdated or unavailable `localStorage`** (bad JSON, other version, `setItem` throws in private mode) → app falls back to seed / in-memory and renders. (Task 6 tests)
3. **Reload `/join` after signing up** → same member's current screen; "Start over as someone new" forgets only the current member id, not the data. (Task 6 + Task 9 tests)
4. **Declining leaves a table at 3 with nobody compatible to backfill** → event stays, `isUnderFilled` is true, the decliner returns to the pool. (Task 4 test)
5. **Signing up when the slot's next occurrence is under 48 h away** → the event is scheduled a week later. (Task 2 test)

---

## File Structure

```
src/domain/types.ts                 + Member, MeetupEvent, Feedback, LocationRule, …; persona optional; FilterName + "province"
src/domain/matching/filters.ts      location rule support
src/domain/matching/grouping.ts     buildGroups(users, w, rule)
src/domain/live/slots.ts            LIVE_SLOTS, slotLabel, nextOccurrence
src/domain/live/member.ts           toMatchUser, validateSignup
src/domain/live/venues.ts           pickVenue
src/domain/live/events.ts           seatMember, declineSeat, formTables, waitlistNeeded, isUnderFilled, eventsForMember
src/data/locations.ts               81 provinces + districts (+ coords for seeded cities)
src/data/venues.ts                  venues for seeded cities
src/data/live-vocab.ts              LANGUAGES
scripts/generate-seed.ts            deterministic seed → src/data/seed.ts
src/data/seed.ts                    generated, committed (offsets)
src/store/store.ts                  Store interface, materializeSeed
src/store/local-store.ts            LocalStore
src/store/use-store.ts              React hook
src/components/join/*.tsx          JoinApp, SignupForm, Chip, TableCard, WaitlistCard, FeedbackForm
src/pages/join.astro
tests/unit/live-*.test.ts, store.test.ts, seed.test.ts
tests/e2e/join.spec.ts
```

---

### Task 1: Configurable location rule in the matching engine

**Files:**
- Modify: `src/domain/types.ts`, `src/domain/matching/filters.ts`, `src/domain/matching/grouping.ts`, `tests/unit/helpers.ts`
- Test: `tests/unit/filters.test.ts` (append), `tests/unit/grouping.test.ts` (append)

**Interfaces:**
- Produces: `type LocationRule = "distance" | "province"`; `User` gains `province?: string` and `persona` becomes optional; `FilterName` gains `"province"`. `checkPair(a, b, rule: LocationRule = "distance")`; `blockingStats(users, rule = "distance")`; `topBlockingFilter(users, rule = "distance")`; `topBlockingFilterFor(user, others, rule = "distance")`; `buildGroups(users, w, rule: LocationRule = "distance")`. Under `"province"` the first check is `a.province === b.province` (failing name `"province"`) and no distance check is made; the other four checks are unchanged and keep their order.

- [ ] **Step 1: Write the failing tests** (append; `mkUser` default gains `province: "İstanbul"`):

```ts
test("province rule: same province passes even when far apart", () =>
  expect(checkPair(mkUser({ coords: [41.07, 28.24] }), mkUser({}), "province")).toEqual({ ok: true }));
test("province rule: different province fails with 'province'", () =>
  expect(checkPair(mkUser({ province: "Ankara" }), mkUser({}), "province")).toEqual({ ok: false, failed: "province" }));
test("default rule is still distance", () =>
  expect(checkPair(mkUser({ coords: [41.0739, 28.2465] }), mkUser({}))).toEqual({ ok: false, failed: "distance" }));
// grouping.test.ts
test("buildGroups with province rule never mixes provinces", () => {
  const us = [...Array(4)].map(() => mkUser({ province: "Ankara", interests: ["chess"] }))
    .concat([...Array(4)].map(() => mkUser({ province: "İzmir", interests: ["chess"] })));
  const res = buildGroups(us, DEFAULT_WEIGHTS, "province");
  expect(res.groups).toHaveLength(2);
  res.groups.forEach(g => expect(new Set(g.members.map(id => us.find(u => u.id === id)!.province)).size).toBe(1));
});
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/filters.test.ts tests/unit/grouping.test.ts` → the new tests FAIL.
- [ ] **Step 3: Implement.** In `filters.ts` replace the fixed `FILTER_ORDER` with `filterOrder(rule): FilterName[]` (`[rule === "province" ? "province" : "distance", "availability", "language", "age", "intent"]`); add `province` to `passes`; thread `rule` through every exported function. Keep `FILTER_ORDER` exported as `filterOrder("distance")` for compatibility. Thread `rule` through `buildGroups` (pair building, candidate checks, `topBlockingFilterFor`).
- [ ] **Step 4: Run** `npx vitest run` → all PASS (existing 57 + new).
- [ ] **Step 5: Commit** `feat: configurable location rule for matching`

---

### Task 2: Live types, slots and sign-up validation

**Files:**
- Modify: `src/domain/types.ts`, `package.json` (test scripts), `.github/workflows/ci.yml` (no change needed if it uses `npm test`)
- Create: `src/domain/live/slots.ts`, `src/domain/live/member.ts`, `src/data/live-vocab.ts`
- Test: `tests/unit/live-slots.test.ts`, `tests/unit/live-member.test.ts`

**Interfaces:**
- Produces in `types.ts`:

```ts
export type Rsvp = "coming" | "declined";
export type AttendanceStatus = "came" | "no_show" | "unknown";
export type Member = {
  id: string; createdAt: string;                 // ISO
  firstName: string; age: number;
  province: string; district: string;
  intent: Intent; interests: string[];
  book?: string; idea?: string;
  availability: Slot[]; languages: string[];
  tableSize: GroupSize;                          // "small" = 4, "medium" = up to 6
  school?: string; profession?: string;          // profession from PROFESSIONS vocab or free text
};
export type NewMember = Omit<Member, "id" | "createdAt">;
export type Venue = { name: string; type: "cafe" | "bookshop" | "park" | "studio" | "bar"; district: string };
export type MeetupEvent = {
  id: string; province: string; district: string; venue: Venue;
  startsAt: string; capacity: 4 | 6;
  memberIds: string[]; reasons: Reason[]; cohesion: number;
  status: "upcoming" | "past" | "cancelled";
  rsvps: Record<string, Rsvp>; attendance: Record<string, AttendanceStatus>;
};
export type Feedback = { eventId: string; memberId: string; rating: 1 | 2 | 3 | 4 | 5; meetAgain: string[] };
```

- `slots.ts`: `LIVE_SLOTS: Slot[]` = every `<day>_<part>` for days `mon…sun` and parts `morning | afternoon | evening` (21, Monday first); `SLOT_START = { morning: [10, 0], afternoon: [14, 0], evening: [19, 30] }`; `slotLabel(slot): string` ("thu_evening" → "Thursday evening"; reuse `formatSlot` logic, then make `src/lib/format.ts` re-export it); `nextOccurrence(slot: Slot, now: Date, minLeadHours = 48): Date` (local time).
- `member.ts`: `validateSignup(input: Partial<NewMember>, consent: boolean): { ok: true; member: NewMember } | { ok: false; errors: Partial<Record<keyof NewMember | "consent", string>> }` with rules from spec §5.1 (first name 1–40 trimmed; age 18–99 integer; province and district required and district must belong to province via `districtsOf` from Task 3 — import lazily, see Step 3; intent required; interests 3–8; idea ≤ 200; availability ≥ 1; languages ≥ 1; consent true). `toMatchUser(m: Member): User` — `id`, `name: firstName`, `age`, `district`, `province`, `coords: [0, 0]`, `languages`, `intent`, `availability`, `interests`, `books: book ? [book] : []`, `authors: []` (or the vocab author when `book` matches a `BOOKS` title), `profession` and `industry` from `PROFESSIONS` (free text → profession only, industry `""`), `schools: school ? [school] : []`, `groupSizePref: tableSize`, no `persona`.
- `live-vocab.ts`: `LANGUAGES = ["Turkish", "English", "German", "Arabic", "Russian", "Other"]`.

- [ ] **Step 1: Write the failing tests:**

```ts
// live-slots.test.ts  (TZ=Europe/Istanbul)
const now = new Date("2026-10-19T09:00:00+03:00"); // Monday
test("21 slots, Monday morning first", () => { expect(LIVE_SLOTS).toHaveLength(21); expect(LIVE_SLOTS[0]).toBe("mon_morning"); });
test("next Thursday evening is 3 days out", () =>
  expect(nextOccurrence("thu_evening", now).toISOString()).toBe(new Date("2026-10-22T19:30:00+03:00").toISOString()));
test("a slot under 48h away moves a week later", () =>
  expect(nextOccurrence("tue_evening", now).toISOString()).toBe(new Date("2026-10-27T19:30:00+03:00").toISOString()));
test("slotLabel", () => expect(slotLabel("sat_morning")).toBe("Saturday morning"));

// live-member.test.ts
const valid = { firstName: "Elif", age: 29, province: "İstanbul", district: "Kadıköy", intent: "friendship",
  interests: ["hiking", "jazz", "chess"], availability: ["thu_evening"], languages: ["Turkish"], tableSize: "medium" } as const;
test("valid sign-up passes", () => expect(validateSignup(valid, true).ok).toBe(true));
test("needs consent", () => expect(validateSignup(valid, false)).toMatchObject({ ok: false, errors: { consent: expect.any(String) } }));
test("needs 3 interests", () => expect(validateSignup({ ...valid, interests: ["hiking"] }, true)).toMatchObject({ ok: false, errors: { interests: expect.any(String) } }));
test("district must belong to province", () => expect(validateSignup({ ...valid, district: "Çankaya" }, true)).toMatchObject({ ok: false, errors: { district: expect.any(String) } }));
test("under 18 rejected", () => expect(validateSignup({ ...valid, age: 17 }, true).ok).toBe(false));
test("toMatchUser maps fields and never sets persona", () => {
  const u = toMatchUser({ ...valid, id: "m1", createdAt: "2026-10-19T06:00:00.000Z", book: "Huzur", profession: "Editor" });
  expect(u).toMatchObject({ id: "m1", name: "Elif", province: "İstanbul", books: ["Huzur"], authors: ["Ahmet Hamdi Tanpınar"], industry: "media", groupSizePref: "medium" });
  expect("persona" in u).toBe(false);
});
```

- [ ] **Step 2: Run** → FAIL (modules missing). Set scripts first: `"test": "TZ=Europe/Istanbul vitest run"`, `"e2e": "TZ=Europe/Istanbul playwright test"`.
- [ ] **Step 3: Implement.** `validateSignup` imports `districtsOf` from `src/data/locations.ts`; until Task 3 lands, create `locations.ts` with just İstanbul, Ankara, İzmir (full district lists come in Task 3, same export).
- [ ] **Step 4: Run** `npm test` → PASS.
- [ ] **Step 5: Commit** `feat: live member types, slots and sign-up validation`

---

### Task 3: Locations and venues

**Files:**
- Create/replace: `src/data/locations.ts`, `src/data/venues.ts`, `src/domain/live/venues.ts`
- Test: `tests/unit/live-venues.test.ts`

**Interfaces:**
- Produces: `type Province = { name: string; districts: string[]; center?: [number, number] }`; `PROVINCES: Province[]` (81, alphabetical by Turkish collation, each with its districts); `districtsOf(province: string): string[]`; `SEEDED_CITIES = ["İstanbul", "Ankara", "İzmir"]` with `center` coords; `nearestSeededCity(coords: [number, number]): string` (uses `distanceKm`). `VENUES: Venue[]` with ≥ 4 venues per seeded city covering all five types, fictional generic names (e.g. "Moda Book Café"), each `district` a real district of its city. `pickVenue(province, district, topInterest: string | undefined): Venue` — prefer a venue in the same province whose type fits the interest (map: book/literary/poetry/philosophy/writing → bookshop; hiking/cycling/running/climbing/bosphorus walks → park; design/photography/art/film → studio; live music/jazz/dancing → bar; else cafe), then any venue in that province, then `{ name: "A café in {district}", type: "cafe", district }`.

- [ ] **Step 1: Source the data.** Find a public dataset of Turkey's 81 provinces and their districts (ilçe) whose licence allows redistribution (MIT, CC0, CC-BY or public-domain government data). Record source URL, licence and access date in the file header. If none qualifies, use the spec §7.4 fallback: 81 province names, full district lists only for the three seeded cities, and `["Merkez", "Other district"]` elsewhere — and note the fallback in the header.
- [ ] **Step 2: Write the failing tests:**

```ts
test("81 provinces", () => expect(PROVINCES).toHaveLength(81));
test("Kadıköy is in İstanbul", () => expect(districtsOf("İstanbul")).toContain("Kadıköy"));
test("every venue district belongs to its city", () =>
  VENUES.forEach(v => expect(SEEDED_CITIES.some(c => districtsOf(c).includes(v.district))).toBe(true)));
test("bookish group gets a bookshop in İstanbul", () => expect(pickVenue("İstanbul", "Kadıköy", "literary fiction").type).toBe("bookshop"));
test("province without venues gets a generic café", () =>
  expect(pickVenue("Van", "Merkez", "hiking")).toEqual({ name: "A café in Merkez", type: "cafe", district: "Merkez" }));
test("nearest seeded city to Bornova is İzmir", () => expect(nearestSeededCity([38.46, 27.22])).toBe("İzmir"));
```

- [ ] **Step 3: Run** → FAIL. **Step 4: Implement.** **Step 5: Run** `npm test` → PASS.
- [ ] **Step 6: Commit** `feat: Turkish provinces, districts and venues`

---

### Task 4: Event engine (seat, decline, form, waitlist)

**Files:**
- Create: `src/domain/live/events.ts`
- Test: `tests/unit/live-events.test.ts`

**Interfaces:**
- Consumes: `toMatchUser` (Task 2), `nextOccurrence` (Task 2), `pickVenue` (Task 3), `checkPair`, `sharedSlots`, `pairScore`, `explainGroup`, `buildGroups` with `"province"` (Task 1).
- Produces:

```ts
type LiveState = { members: Member[]; events: MeetupEvent[] };
type SeatResult =
  | { kind: "seated"; event: MeetupEvent }          // joined an existing upcoming event
  | { kind: "new"; event: MeetupEvent }             // formed a new table
  | { kind: "waitlist"; needed: number };
seatMember(memberId: string, state: LiveState, now: Date, w: MatchWeights, newId: () => string): { result: SeatResult; events: MeetupEvent[] }
declineSeat(eventId: string, memberId: string, state: LiveState, now: Date, w: MatchWeights): MeetupEvent[]
formTables(province: string, state: LiveState, now: Date, w: MatchWeights, newId: () => string): MeetupEvent[]   // new events only
waitlistNeeded(memberId: string, state: LiveState): number
isUnderFilled(e: MeetupEvent): boolean            // upcoming && memberIds.length < 4
unplacedMembers(province: string, state: LiveState): Member[]   // not in any upcoming event's memberIds
currentEventFor(memberId: string, state: LiveState, now: Date): MeetupEvent | undefined  // the member's upcoming event (startsAt > now, status upcoming); else their most recent past event; else undefined
```

Rules (fixed here, not determined by signatures):
- **Seat in existing event first:** candidates = upcoming events in the member's province with `memberIds.length < capacity`, where every current member passes `checkPair(…, "province")` with the newcomer and `startsAt`'s slot is in the newcomer's availability. Pick highest mean `pairScore` to members; ties by event id. Add the member; recompute `reasons` and `cohesion`.
- **Else form a new table:** run `buildGroups` on `unplacedMembers(province)` (including the newcomer) with `"province"`; take the first group containing the newcomer. Event: `capacity` 4 if every member's `tableSize` is `"small"` else 6; `startsAt = nextOccurrence(group.slot, now)`; `district` = group's venue district; `venue = pickVenue(province, district, topSharedInterest)`; `rsvps`/`attendance` empty; `status: "upcoming"`. Other new groups that don't contain the newcomer are **not** created here.
- **Else waitlist:** `needed = max(1, 3 − compatible)` where `compatible` = unplaced members in the province that pass `checkPair` with the member.
- **Decline:** remove the member from `memberIds` and delete their `rsvps` entry (`memberIds` is authoritative; the `"declined"` Rsvp value is reserved for the admin plan's reporting). If the event now has < 4 members, try to seat the best compatible unplaced member (excluding the decliner) using the same fit rule; repeat until 4 or no candidate.
- **formTables:** `buildGroups` over unplaced members of the province; every group becomes an event as above.

- [ ] **Step 1: Write the failing tests** (build fixtures with a `mkMember(overrides)` helper in `tests/unit/helpers.ts`; `now = 2026-10-19T09:00+03:00`; `newId` from a counter):

```ts
test("seats a newcomer into a compatible event with an open seat", …expect(result.kind).toBe("seated"); expect(event.memberIds).toContain("new"));
test("never seats into an event in another province", …);
test("never seats into a full event (capacity reached)", …);
test("forms a new table from unplaced members when no event fits", …expect(result.kind).toBe("new"); expect(event.memberIds.length).toBeGreaterThanOrEqual(4));
test("new table starts ≥ 48h from now on the shared slot", …);
test("existing events' other members are unchanged after seating", …);
test("alone in Van → waitlist needs 3", () => expect(seatMember("van1", { members: [vanMember], events: [] }, now, DEFAULT_WEIGHTS, id).result).toEqual({ kind: "waitlist", needed: 3 }));
test("two compatible unplaced → waitlist needs 1", …);
test("decline backfills from the unplaced pool", …expect(updated.memberIds).toHaveLength(4); expect(updated.memberIds).not.toContain("decliner"));
test("decline with no candidate leaves an under-filled event", …expect(isUnderFilled(updated)).toBe(true));
test("formTables creates one event per group and none across provinces", …);
test("persona-free: toMatchUser output feeds buildGroups without persona", …);
```

Write each test fully with explicit fixtures and assertions; the outlines above name the fixture and the decisive assertion.

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `events.ts`. **Step 4: Run** `npm test` → PASS.
- [ ] **Step 5: Commit** `feat: live event seating, waitlist and backfill`

---

### Task 5: Deterministic seed

**Files:**
- Create: `scripts/generate-seed.ts`, `src/data/seed.ts` (generated)
- Modify: `package.json` (`"gen:seed": "tsx scripts/generate-seed.ts"`)
- Test: `tests/unit/seed.test.ts`

**Interfaces:**
- Consumes: Tasks 2–4, vocab, `mulberry32` (move it from `scripts/generate-users.ts` to `scripts/rng.ts` and import it in both scripts; `generate-users` output must stay identical — its test proves it).
- Produces: `src/data/seed.ts` exporting `SEED: SeedData` where

```ts
type SeedData = {
  members: (Omit<Member, "createdAt"> & { createdOffsetMin: number })[];   // minutes before "now" (positive)
  events: (Omit<MeetupEvent, "startsAt"> & { startsOffsetMin: number })[];  // negative = past, positive = future
  feedback: Feedback[];
};
```

Generation (seed `2026`):
- 300 members: İstanbul 140, Ankara 70, İzmir 30, Bursa 15, Antalya 12, Eskişehir 10, Trabzon 6, Gaziantep 5, Konya 4, Samsun 4, Muğla 2, Van 2. Districts from `districtsOf`, weighted toward the venues' districts in seeded cities. Interests, books, professions, schools, languages (`Turkish` always; 35% also `English`), table size (60% medium), intent (60% friendship, 25% networking, 15% hobby_partner), ages 21–45, availability 2–4 slots from `LIVE_SLOTS` with evening weight.
- `createdOffsetMin`: spread over 0–60 days; hour of day drawn so that 21:00–23:00 is the busiest window.
- Past events: for each of the last 6 weeks, run `formTables` per seeded city on members who existed then, with `now` shifted; mark events `past`; attendance: `came` 70%, `no_show` 20%, `unknown` 10%, then adjust repeat attendance so that (members with ≥ 2 `came`) ÷ (members with ≥ 1 `came`) is within 0.28–0.34. Feedback for 60% of `came` records (rating 3–5, 0–2 meet-again picks from tablemates).
- Backlog issues and sprints are **not** part of this seed; the Jira-tools plan extends `SeedData` with them.
- Upcoming events: `formTables` for the next two weeks, then remove ~15% of members from upcoming events in each seeded city (so they are unplaced) and leave at least 3 events per seeded city with open seats.

- [ ] **Step 1: Write the failing tests:**

```ts
test("300 members, unique ids", …);
test("80% in the three seeded cities", () => expect(SEED.members.filter(m => SEEDED_CITIES.includes(m.province)).length).toBe(240));
test("busiest 2-hour sign-up window starts at 21:00", …);   // compute with a fixed now
test("second-meetup rate between 0.28 and 0.34", …);
test("each seeded city has ≥ 3 upcoming events with open seats and ≥ 10% unplaced members", …);
test("no event mixes provinces; every member of an event passes checkPair with the others", …);
test("deterministic: regenerating equals the committed seed", () => expect(generateSeed(2026)).toEqual(SEED));
test("a province with < 4 members exists (waitlist demo)", …);
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** and run `npm run gen:seed`. **Step 4: Run** `npm test` → PASS. If calibration tests fail, tune generator weights, not the tests.
- [ ] **Step 5: Commit** `feat: deterministic demo seed with past and upcoming events`

---

### Task 6: Store

**Files:**
- Create: `src/store/store.ts`, `src/store/local-store.ts`, `src/store/use-store.ts`
- Test: `tests/unit/store.test.ts`

**Interfaces:**
- Produces:

```ts
interface Store {
  listMembers(): Member[]; addMember(m: NewMember): Member;
  listEvents(): MeetupEvent[]; saveEvents(events: MeetupEvent[]): void;       // upsert by id
  setRsvp(eventId: string, memberId: string, rsvp: Rsvp): void;
  saveFeedback(f: Feedback): void; listFeedback(): Feedback[];
  getCurrentMemberId(): string | null; setCurrentMemberId(id: string | null): void;
  reset(): void; subscribe(listener: () => void): () => void;
}
materializeSeed(seed: SeedData, now: Date): { members: Member[]; events: MeetupEvent[]; feedback: Feedback[] }
class LocalStore implements Store { constructor(opts: { storage?: Storage | null; now?: () => Date; newId?: () => string; seed?: SeedData }) }
useStore(): Store   // singleton LocalStore on window; re-renders on subscribe
```

`saveEvents` replaces the spec's `saveEvent` so seating can write several events at once; `setAttendance`/`deleteEvent` arrive with the admin plan. Keys: `likeminded:v1:members`, `…:events`, `…:feedback`, `…:currentMember`, `…:seededAt`. First load (no `seededAt`) materializes the seed with `now()`. Bad JSON or a missing key while `seededAt` exists → warn and re-seed. `storage` null or throwing → in-memory `Map` fallback. `newId` default `crypto.randomUUID`. Cross-tab: listen to `window` `storage` events when available.

- [ ] **Step 1: Write the failing tests** with a fake `Storage` (Map-backed) and a fixed `now`:

```ts
test("first load materializes the seed", () => expect(new LocalStore({ storage: fake(), now }).listMembers()).toHaveLength(300));
test("offsets become dates relative to now", …);
test("addMember persists across instances on the same storage", …);
test("corrupt JSON falls back to seed and warns", …);
test("throwing storage falls back to memory", …);
test("currentMemberId round-trips; setCurrentMemberId(null) keeps members", …);
test("reset restores the seed and clears currentMember", …);
test("subscribe is called on writes and unsubscribe stops it", …);
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** `npm test` → PASS.
- [ ] **Step 5: Commit** `feat: browser store with seed, fallback and subscriptions`

---

### Task 7: Sign-up form UI

**Files:**
- Create: `src/components/join/Chip.tsx`, `src/components/join/SignupForm.tsx`, `src/components/join/JoinApp.tsx` (form screen only for now), `src/pages/join.astro`
- Modify: `src/layouts/BaseLayout.astro` (add a "Try the product" link above the module list, accent pill)
- Test: Task 9 e2e

**Interfaces:**
- Consumes: `validateSignup`, `LIVE_SLOTS`, `slotLabel`, `PROVINCES`, `districtsOf`, `nearestSeededCity`, vocab (`INTERESTS`, `BOOKS`, `PROFESSIONS`, `SCHOOLS`), `LANGUAGES`, `useStore`.
- Produces: `<SignupForm onSubmit={(m: NewMember) => void} />`; `<Chip selected onToggle label />` (a `button` with `aria-pressed`); `/join` page using its own minimal layout (no case-study sidebar), title "Join · Likeminded".

UI requirements (from spec §5.1 and the approved hybrid mockup):
- Headline (serif): "Find your people, wherever you live." Sub: "Tell us what you love. We'll set the table, and keep the guest list a surprise."
- Field order and rules exactly as spec §5.1. Province select lists 81; district select repopulates on province change. "Use my location" link: on success preselects `nearestSeededCity` and its first district; on error shows "Couldn't get your location. Pick your city instead." inline.
- Interests and availability as chip groups with counters ("3 of 3–8 selected"). Book field: `<input list>` with `BOOKS` titles.
- Errors appear under each field after submit, announced via `aria-describedby`; first invalid field gets focus.
- Primary button: "Set my table" (rounded-full, accent).
- Mobile-first: single column, 16px side padding, chips wrap.

- [ ] **Step 1: Implement components and page.**
- [ ] **Step 2: Verify in the browser** (`/join`): submit empty → errors shown and first field focused; choose Ankara → district list shows Çankaya; select 3 interests → counter updates; no horizontal scroll at 375px.
- [ ] **Step 3: Commit** `feat: sign-up form`

---

### Task 8: Table, waitlist, decline and feedback screens

**Files:**
- Create: `src/components/join/TableCard.tsx`, `src/components/join/WaitlistCard.tsx`, `src/components/join/FeedbackForm.tsx`
- Modify: `src/components/join/JoinApp.tsx`
- Test: Task 9 e2e

**Interfaces:**
- Consumes: `seatMember`, `declineSeat`, `waitlistNeeded`, `currentEventFor`, `slotLabel`, `useStore`.
- Produces `JoinApp` screens, chosen from store state for `getCurrentMemberId()`:
  - no current member → form; on submit: `addMember`, `setCurrentMemberId`, `seatMember`, `saveEvents`.
  - upcoming event → **TableCard**: label "Your table is set"; serif date-time (`"Thursday, 19:30"`); "{venue.name} · {district}" and "{n} seats"; one "?" circle per other member; up to 3 hints = event `reasons` texts rewritten to second person ("3 of 5 read Huzur" → "Three of you read Huzur" — number words one…six); buttons "I'm coming" (→ `setRsvp(…, "coming")`; the button becomes a disabled "You're coming") and "Not this time" (→ `declineSeat`, `saveEvents`; seating is **not** re-run, the member returns to the pool and sees the waitlist screen with the extra line "We'll find you another table soon.").
  - past event without the member's feedback → **FeedbackForm**: "How was it?" 1–5 radio stars (accessible radio group), "Who would you like to meet again?" checkboxes with tablemates' first names now revealed, "Send" → `saveFeedback`, then a thank-you state.
  - otherwise waitlist → **WaitlistCard**: "We need {needed} more {people|person} in {province} to set your first table. You're on the list."
- Footer link on every screen: "Start over as someone new" → `setCurrentMemberId(null)`.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify in the browser:** sign up in İstanbul with popular interests and an evening slot → table card; "Not this time" → waitlist message; start over and sign up in Van → waitlist "We need 3 more people in Van"; reload keeps the screen.
- [ ] **Step 3: Commit** `feat: table, waitlist and feedback screens`

---

### Task 9: End-to-end, accessibility and docs

**Files:**
- Create: `tests/e2e/join.spec.ts`
- Modify: `tests/e2e/pages.spec.ts` (add `/join` to routes), `README.md` (section "Try the product" with what `/join` does and the storage note)

- [ ] **Step 1: Write `join.spec.ts`:**
  - Sign up in İstanbul (fill every required field via labels, choose interests that the seed favours and the `thu_evening` slot) → "Your table is set" visible; no "NaN"/"undefined" on the page.
  - Click "I'm coming" → "You're coming".
  - Reload → still on the table card.
  - "Start over as someone new" → form visible; sign up in Van → text "We need 3 more people in Van".
  - Feedback: before navigation, `page.addInitScript` writes a store state where the current member's event is past → "How was it?" visible; submit 5 stars → thank-you text.
  - Empty submit → focus on "First name" and an error message visible.
- [ ] **Step 2: Run** `npm run e2e` → all PASS (existing 27 + new). Fix the app, not the tests.
- [ ] **Step 3: README** update; then `npm test && npm run build`.
- [ ] **Step 4: Commit** `test: member app e2e and docs`
- [ ] **Step 5: Owner action:** push to GitHub (Vercel deploys) and try `/join` on a phone.
