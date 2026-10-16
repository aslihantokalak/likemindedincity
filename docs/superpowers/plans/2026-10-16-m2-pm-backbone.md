# Likeminded Portfolio M2 (PM Backbone) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the PM backbone of the case: Discovery, a three-version PRD, a Backlog with live RICE re-ranking, ADR-003 to ADR-006, Technical Design diagrams and the API contract. Every backlog item, API endpoint and solution traces to a PRD requirement, and every requirement traces to a discovery finding. The test suite and the build both fail on a broken link. M2 also closes the minor issues left over from the M1 review.

**Architecture:** Case content that other content links to (findings, requirements, backlog, API endpoints) is typed TypeScript data in `src/data/`. Long prose (PRD sections, ADRs) is MDX in content collections. A pure `src/domain/traceability.ts` checks every cross-reference. Unit tests call it, and the PRD and Backlog pages call it at build time, so a broken reference breaks `npm test` and `npm run build`. Mermaid diagrams are pre-rendered to committed SVGs by a script, the same way `users.ts` is generated, and a test fails when an SVG is stale.

**Tech Stack:** As in M1 (Astro 7.4, @astrojs/react, @astrojs/mdx, React 19, TypeScript strict, Tailwind 4, Vitest 5, Playwright 1.64, @axe-core/playwright). New dev dependency: `mermaid-isomorphic` (renders Mermaid in Playwright's Chromium) plus `mermaid` if it is a peer dependency.

**Spec:** `docs/specs/2026-10-16-likeminded-portfolio-design.md` (§3 modules 2, 3, 4, 7, 8; §5 `BacklogItem`; §7 testing; §8.1 M2). Conventions and existing interfaces: `docs/superpowers/plans/2026-10-16-m1-core.md`.

## Global Constraints

- All site copy is in English.
- Static output only: interactive state lives in memory, resets on reload, and every interactive widget has a Reset button with a touch target of at least 44×44 px.
- `src/domain/**` never imports from `src/components/**`, `src/pages/**`, `src/data/**`, React or Astro. Data files import domain types, never the reverse.
- Matching never reads `User.persona`.
- No percentage is typed by hand. Every percentage comes from `src/domain/metrics.ts` (`pct`, `storyMetrics`). The only literal allowed is the confidence level "95% CI".
- Deterministic ordering everywhere: ties are broken with `byString` from `src/domain/compare.ts`, never `localeCompare`.
- Every page is readable at 375px width with no horizontal page scroll. Wide content (code, tables, diagrams) scrolls inside its own container or scales down.
- Playwright `webServer` keeps `--ignore-lock` (Astro auto-backgrounds `preview` when an AI agent runs it). Run the dev server as `astro dev --background` (AGENTS.md).
- Factual claims in ADRs are verified against a primary source when they are written, and cited with a link plus a "Sources checked on <date>" line. A claim that cannot be verified is removed, not softened.
- Story numbers (6,000 active users, 71% / 23% / 58%, A/B 23% → 31%, target 35%, onboarding −3 pts) come only from `src/data/analytics.ts` through `metrics.ts`.
- Requirement IDs match `^(FR|NFR)-\d+$`. A retired ID is never reused.
- Backlog IDs are zero-padded so that `byString` order equals numeric order: `E-01`…`E-06`, `S-01`…, `T-01`….

## Review Focus

1. **A RICE field that is cleared, negative or non-numeric** while editing (`""` → `NaN`). Expected: the score is a finite number (0 for reach, effort floored to 0.5), ranks stay a permutation of 1…n, and no "NaN" or "Infinity" appears on the page. (Task 7: `rerank sanitises bad input` unit test and the e2e "clearing a field" test.)
2. **A `prdRef` that points to a requirement removed in v1.0** (for example `FR-6`, which exists only in v0.1). Expected: traceability reports it as broken, because references resolve only against the current PRD version. (Task 3: `retired requirement is a broken ref` test.)
3. **Board view filtered to Epics, which leaves some status columns empty.** Expected: an empty column shows "Nothing here", not a blank box, and the board still has four columns. (Task 7 e2e.)
4. **Dragging a simulator slider through many steps quickly.** Expected: screen readers hear one summary after the value settles, not one per step. (Task 2 e2e with Playwright's clock.)
5. **A `.mmd` source edited without re-running the renderer, and diagrams viewed in dark mode.** Expected: the unit test fails on the stale hash, and each diagram has a dark variant served through `<picture>`. (Task 8 tests.)

---

## File Structure

```
src/domain/slots.ts               compareSlots: week order for "thu_evening"-style slots
src/domain/content-types.ts       Interview, Persona, Finding, Opportunity, Requirement…, ApiEndpoint
src/domain/prd.ts                 PRD version order, requirementsAt, diffVersions, compareReqIds
src/domain/traceability.ts        traceabilityErrors, assertTraceable
src/domain/rice.ts                (modify) RiceInputs export, sanitizeRiceInputs, rerank
src/domain/matching/filters.ts    (modify) sharedSlots sorted by week order
src/data/discovery.ts             INTERVIEWS, PERSONAS, FINDINGS, JOBS, OPPORTUNITIES
src/data/prd.ts                   PRD_VERSIONS, REQUIREMENT_REVISIONS
src/data/backlog.ts               BACKLOG
src/data/api.ts                   API_ENDPOINTS
src/data/trace.ts                 caseTraceInput(adrNumbers): TraceInput, built from the data files above
src/data/diagrams.ts              GENERATED: DIAGRAMS manifest (width, height, sourceHash)
src/diagrams/{system,matching-run,privacy-flow}.mmd
public/diagrams/<name>.{light,dark}.svg   GENERATED
scripts/render-diagrams.ts
src/content/prd/v0-1.mdx, v0-5.mdx, v1-0.mdx
src/content/adr/003-group-size.mdx, 004-rules-before-ml.mdx, 005-availability-hard-filter.mdx, 006-raw-data-never-stored.mdx
src/content.config.ts             (modify) add prd collection
src/lib/useDebouncedValue.ts      shared React hook for live-region announcements
src/lib/simulator-copy.ts         emptyStateText
src/components/DiscoveryFindings.tsx   tag filter island
src/components/BacklogBoard.tsx        list + board island
src/components/Diagram.astro           <figure><picture> wrapper
src/components/ApiContract.astro
src/components/PrdView.astro
src/pages/discovery.astro, backlog.astro, prd/[...version].astro
src/pages/technical-design.astro, decision-log/index.astro, index.astro, [module].astro   (modify)
tests/unit/{slots,traceability,prd,discovery,backlog,api,diagrams,percent,simulator-copy}.test.ts
tests/e2e/{discovery,prd,backlog}.spec.ts
```

**Ordering.** Tasks 1, 2 and 8 depend on nothing else in this plan. Tasks 4 → 5 → 6 → 7 → 9 form a chain: findings, then ADRs, then requirements, then backlog, then API. Each one's references must resolve to the one before it. Task 10 comes last.

---

### Task 1: Group slot is the earliest shared slot in the week

**Files:**
- Create: `src/domain/slots.ts`
- Modify: `src/domain/matching/filters.ts` (`sharedSlots`), `tests/unit/filters.test.ts:24-26`
- Test: `tests/unit/slots.test.ts`, `tests/unit/grouping.test.ts`

**Interfaces:**
- Produces: `compareSlots(a: Slot, b: Slot): number`. It orders days `mon…sun`, then parts `morning < afternoon < evening`. A slot with an unknown day or part sorts after every known slot, and ties fall back to `byString`. `sharedSlots` keeps its signature but returns slots in week order, so `Group.slot = sharedSlots(members)[0]` becomes the earliest slot without any change to `grouping.ts`.

- [ ] **Step 1: Write the failing tests.** `tests/unit/slots.test.ts`:

```ts
test("week order, then part of day", () =>
  expect(["sun_morning","thu_evening","sat_morning","thu_afternoon","mon_evening"].sort(compareSlots))
    .toEqual(["mon_evening","thu_afternoon","thu_evening","sat_morning","sun_morning"]));
test("unknown slots go last, deterministically", () =>
  expect(["zzz","sat_morning","aaa_evening"].sort(compareSlots)).toEqual(["sat_morning","aaa_evening","zzz"]));
```

In `filters.test.ts`, change the expectation to `["thu_evening","sat_morning"]` and rename the test to "sharedSlots is the intersection in week order". In `grouping.test.ts` add:

```ts
test("group slot is the earliest shared slot in the week", () => {
  const ms = [0,1,2,3].map(() => mkUser({ availability: ["sat_morning","thu_evening"] }));
  expect(buildGroups(ms, DEFAULT_WEIGHTS).groups[0].slot).toBe("thu_evening");
  r.groups.forEach(g => expect(g.slot).toBe(sharedSlots(g.members.map(byId))[0]));
});
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/slots.test.ts tests/unit/filters.test.ts tests/unit/grouping.test.ts` → FAIL.
- [ ] **Step 3: Implement** `slots.ts`, then sort in `sharedSlots` with `compareSlots` instead of `byString`.
- [ ] **Step 4: Run** `npx vitest run` → all PASS.
- [ ] **Step 5: Commit** `fix: group meets at the earliest shared slot in the week`

---

### Task 2: Simulator accessibility fixes and dependency hygiene

**Files:**
- Create: `src/lib/useDebouncedValue.ts`, `src/lib/simulator-copy.ts`, `tests/unit/simulator-copy.test.ts`
- Modify: `src/components/MatchSimulator.tsx`, `package.json` / `package-lock.json`, `tests/e2e/simulator.spec.ts`

**Interfaces:**
- Produces: `useDebouncedValue<T>(value: T, delayMs: number): T`, and `export const ANNOUNCE_DELAY_MS = 600` (Task 7 reuses both). `emptyStateText(blocker: FilterName | null): string`.

Copy for `emptyStateText` (exact):
- With a blocker: `No groups formed with these settings. The filter blocking the most pairs is ${blocker}.`
- `null`: `No groups formed with these settings. Every pair passes the hard filters, but no four people are all compatible with each other and share a time slot.`

- [ ] **Step 1: Write the failing unit test** `simulator-copy.test.ts`. With `"availability"`, the text contains `is availability.`. With `null`, the text does not match `/none/` and contains `"hard filters"`.
- [ ] **Step 2: Write the failing e2e tests** in `simulator.spec.ts`:
  - `"summary is announced once the slider settles"`. The test must use a weight change that actually changes the summary. In the test, import `buildGroups`, `DEFAULT_WEIGHTS` and `USERS`, then find the first Diversity value in 0, 0.05, …, 1 whose `groups.length` or `unmatched.length` differs from the defaults, and `expect` that one exists.
    - Call `await page.clock.install()` before `goto`.
    - Read the `getByTestId("sim-announcer")` text, then fill "Diversity" with that value.
    - Expect `sim-summary` to have changed while `sim-announcer` still holds the old text.
    - `await page.clock.runFor(1000)`, then expect the announcer text to equal the summary text.
  - `"Reset is at least 44px"`: the `boundingBox()` of `getByRole("button", { name: "Reset" })` has `height >= 44 && width >= 44`.
- [ ] **Step 3: Run** `npx vitest run tests/unit/simulator-copy.test.ts` and `npx playwright test tests/e2e/simulator.spec.ts` → both FAIL.
- [ ] **Step 4: Implement.** In `MatchSimulator.tsx`:
  - The visible summary `<p data-testid="sim-summary">` loses `aria-live`.
  - Add `<p className="sr-only" aria-live="polite" data-testid="sim-announcer">{useDebouncedValue(summary, ANNOUNCE_DELAY_MS)}</p>`.
  - Give Reset the classes `min-h-11 min-w-11 px-4`.
  - Render the empty state through `emptyStateText(blocker)`.
- [ ] **Step 5: Move type packages** with `npm i -D @types/react@^19.3.0 @types/react-dom@^19.3.0`. Check that `package.json` lists them only under `devDependencies`.
- [ ] **Step 6: Verify** `npx vitest run` → PASS, `npm run e2e` → PASS.
- [ ] **Step 7: Commit** `fix: debounce simulator announcements, 44px Reset, clearer empty state; move @types to devDependencies`

---

### Task 3: Content types, PRD versioning and traceability (pure domain)

**Files:**
- Create: `src/domain/content-types.ts`, `src/domain/prd.ts`, `src/domain/traceability.ts`
- Test: `tests/unit/prd.test.ts`, `tests/unit/traceability.test.ts` (fixtures only; real data arrives in later tasks)

**Interfaces (produced; later tasks rely on these exact names):**

```ts
// content-types.ts
export type PersonaId = User["persona"];                       // "newcomer" | "introvert_reader" | "founder"
export type FindingTag = "match-quality" | "explanation" | "onboarding" | "privacy"
                       | "safety" | "group-size" | "scheduling" | "feedback";
export type Interview = { id: string /* "I-01" */; alias: string; age: number; district: string;
  persona: PersonaId; summary: string; quotes: string[] };
export type Persona = { id: PersonaId; name: string; tagline: string; goals: string[]; frustrations: string[] };
export type Job = { persona: PersonaId; statement: string };   // "When …, I want to …, so I can …"
export type Finding = { id: string /* "F-01" */; statement: string; tags: FindingTag[]; evidence: string[] /* interview ids */ };
export type Solution = { title: string; prdRefs: string[]; experiment: string };
export type Opportunity = { id: string /* "O-1" */; title: string; findingRefs: string[]; solutions: Solution[] };
export type PrdVersionId = "0.1" | "0.5" | "1.0";
export type RequirementRevision = { id: string; title: string; text: string;
  priority: "must" | "should" | "could"; findingRefs: string[]; adrRefs?: number[];
  since: PrdVersionId; until?: PrdVersionId /* exclusive: the version that changed or removed it */ };
export type PrdVersion = { version: PrdVersionId; slug: "v0-1" | "v0-5" | "v1-0";
  status: "draft" | "in review" | "approved"; stage: string; changeNotes: string[] };
export type ApiEndpoint = { method: "GET" | "POST" | "PUT"; path: string; summary: string; prdRefs: string[];
  request?: unknown; response: { status: number; body: unknown }; errors: { status: number; when: string }[] };

// prd.ts
export const PRD_VERSION_ORDER: PrdVersionId[] = ["0.1", "0.5", "1.0"];
export const CURRENT_PRD_VERSION: PrdVersionId = "1.0";
export function compareReqIds(a: string, b: string): number;   // FR before NFR, then numeric: FR-2 < FR-10 < NFR-1
export function requirementsAt(revs: RequirementRevision[], v: PrdVersionId): RequirementRevision[]; // since ≤ v < until, sorted by compareReqIds
export function diffVersions(revs: RequirementRevision[], from: PrdVersionId, to: PrdVersionId):
  { added: string[]; removed: string[]; changed: string[] };  // each sorted by compareReqIds; changed = present in both, different revision
export function revisionErrors(revs: RequirementRevision[]): string[]; // bad id format, overlapping ranges for one id, id reappearing after removal

// traceability.ts
export type TraceInput = {
  interviewIds: string[]; findings: Finding[]; opportunities: Opportunity[];
  requirements: RequirementRevision[];   // requirementsAt(…, CURRENT_PRD_VERSION)
  adrNumbers: number[];
  backlog: Pick<BacklogItem, "id" | "type" | "parentId" | "prdRef">[];
  api: Pick<ApiEndpoint, "method" | "path" | "prdRefs">[];
};
export function traceabilityErrors(t: TraceInput): string[];   // [] when sound; one message per broken link
export function assertTraceable(t: TraceInput): void;          // throws Error("Broken traceability:\n" + errors.join("\n"))
```

Rules that `traceabilityErrors` enforces. Message format: `"<source id>: <field> <value> does not resolve"` for a broken reference, or a plain sentence for a coverage rule. Each rule needs one fixture test.
1. Every `finding.evidence` id is in `interviewIds`.
2. Every `opportunity.findingRefs` id is a finding. Every `solution.prdRefs` id is a current requirement.
3. Every current FR has at least one `findingRefs` entry. Every `findingRefs` / `adrRefs` entry resolves.
4. Every backlog `story` has a `prdRef`. Every `prdRef` present resolves to a current requirement. `parentId` resolves: a story's parent is an epic and a task's parent is a story. Epics have no parent.
5. Every current FR is the `prdRef` of at least one story: `"FR-n is not covered by any story"`.
6. Every API `prdRefs` id resolves.

- [ ] **Step 1: Write the failing tests.** `prd.test.ts`, on a fixture of four revisions:

```ts
const revs: RequirementRevision[] = [
  r("FR-1", "0.1"), r("FR-2", "0.1", "0.5"), r("FR-2", "0.5"), r("FR-3", "0.1", "0.5"), r("FR-10", "0.5"), r("NFR-1", "1.0"),
]; // r(id, since, until?) builds a revision with title `${id}@${since}` and findingRefs ["F-01"]
test("compareReqIds is numeric, FR before NFR", () =>
  expect(["NFR-1","FR-10","FR-2"].sort(compareReqIds)).toEqual(["FR-2","FR-10","NFR-1"]));
test("requirementsAt picks the live revision", () =>
  expect(requirementsAt(revs, "0.5").map(x => x.title)).toEqual(["FR-1@0.1","FR-2@0.5","FR-10@0.5"]));
test("diffVersions", () => {
  expect(diffVersions(revs, "0.1", "0.5")).toEqual({ added: ["FR-10"], removed: ["FR-3"], changed: ["FR-2"] });
  expect(diffVersions(revs, "0.5", "1.0")).toEqual({ added: ["NFR-1"], removed: [], changed: [] });
});
test("revisionErrors catches overlap, reuse and bad ids", () => {
  expect(revisionErrors(revs)).toEqual([]);
  expect(revisionErrors([...revs, r("FR-1", "0.5")])).not.toEqual([]);       // overlaps FR-1@0.1 (open-ended)
  expect(revisionErrors([...revs, r("FR-3", "1.0")])).not.toEqual([]);       // retired id reused
  expect(revisionErrors([r("Req-1", "0.1")])).not.toEqual([]);
});
```

`traceability.test.ts`: build one sound `TraceInput` fixture with 2 interviews, 2 findings, 1 opportunity, 2 FRs (`FR-1`, `FR-2`), 1 epic `E-01`, 2 stories (one per FR), 1 task and 1 endpoint, and assert `traceabilityErrors(sound)` equals `[]`. Then, for each rule 1–6, a test that breaks one field with a spread copy and asserts that exactly one error appears, containing the offending id. Include:

```ts
test("retired requirement is a broken ref", () => {
  const t = { ...sound, backlog: [...sound.backlog, { id: "S-09", type: "story" as const, parentId: "E-01", prdRef: "FR-6" }] };
  expect(traceabilityErrors(t)).toEqual(["S-09: prdRef FR-6 does not resolve"]);
});
test("assertTraceable throws with every message", () =>
  expect(() => assertTraceable({ ...sound, interviewIds: [] })).toThrow(/Broken traceability:\nF-01/));
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/prd.test.ts tests/unit/traceability.test.ts` → FAIL.
- [ ] **Step 3: Implement** the three modules. `prd.ts` and `traceability.ts` import only from `./types`, `./content-types` and `./compare`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: content types, PRD versioning and traceability checks`

---

### Task 4: Discovery data and page

**Files:**
- Create: `src/data/discovery.ts`, `src/components/DiscoveryFindings.tsx`, `src/pages/discovery.astro`, `tests/unit/discovery.test.ts`, `tests/unit/percent.test.ts`, `tests/e2e/discovery.spec.ts`
- Modify: `src/lib/modules.ts`, `src/pages/[module].astro`, `src/pages/index.astro` ("Coming soon" line), `tests/unit/modules.test.ts`.
  - Add `export const OWN_ROUTE = new Set<string>(["", "technical-design", "decision-log", "discovery"])`. Tasks 6 and 7 add `"prd"` and `"backlog"` when their pages land.
  - `[module].astro` generates placeholders only for `!OWN_ROUTE.has(m.slug)`, so no two files claim one route.
  - The Overview's "Coming soon" uses the same filter.
  - New test `"every OWN_ROUTE slug has a page file"`: `""` maps to `src/pages/index.astro`, any other slug to `src/pages/<slug>.astro` or `src/pages/<slug>/`.

**Interfaces:**
- Consumes: Task 3 types; `storyMetrics`, `pct`; `TARGET_SECOND_MEETUP_RATE`.
- Produces: `INTERVIEWS: Interview[]`, `PERSONAS: Persona[]`, `JOBS: Job[]`, `FINDINGS: Finding[]`, `OPPORTUNITIES: Opportunity[]`. Anchors on the page are `id="I-01"`, `id="F-01"` and `id="O-1"`. Later content links to `/discovery#F-06`.

Content decisions. Prose is drafted by the implementer, about 1,500 words for the whole page; the owner rewrites it later.
- **10 interviews** `I-01`…`I-10`, split 4 newcomer / 3 introvert_reader / 3 founder. They are fictional Istanbul residents with an alias only, no surname. Each has a summary of 60–90 words and 1–2 short quotes. Quotes contain no percentages.
- **Personas:** the three from the spec, "New-in-town professional", "Introverted reader" and "Networking founder", matching `PersonaId`. One `Job` per persona, in the form `When …, I want to …, so I can …`.
- **Findings.** Each has at least 2 evidence interviews. This table fixes the ids, the gist and the tags; the PRD in Task 6 relies on these ids.

| id | gist | tags |
|---|---|---|
| F-01 | Groups felt random; talk died after small talk | match-quality |
| F-02 | A shared book or niche interest was the best icebreaker | match-quality, explanation |
| F-03 | People want to know why they were grouped before committing | explanation |
| F-04 | Typing a long profile feels like work | onboarding |
| F-05 | People won't give a social app access to their accounts | privacy, onboarding |
| F-06 | Meeting one stranger alone feels unsafe; a small group feels safe | safety, group-size |
| F-07 | They skipped meetups that didn't fit their week | scheduling |
| F-08 | Mixing networking and friendship intents disappoints both | match-quality |
| F-09 | No way to say how it went or whom they'd meet again | feedback |
| F-10 | They want a discreet way to report someone | safety |
| F-11 | Silence is worse than "no group this week" | explanation |

- **Opportunity solution tree.** The outcome line is computed on the page: "Raise second-meetup attendance from {pct(secondMeetupRateV1)} to {pct(TARGET_SECOND_MEETUP_RATE)}". The opportunities are below. Solutions carry `prdRefs` from the v1.0 list in Task 6, and each has a one-sentence assumption test (`experiment`).
  - `O-1` "Groups have nothing in common" (F-01, F-02, F-08). Solutions: richer profile signals → FR-2, FR-3, FR-4; separate intents → FR-1.
  - `O-2` "I don't trust the match before I go" (F-03, F-11). Solutions: why this group → FR-10; tell unmatched users why → FR-11.
  - `O-3` "Meetups don't fit my week" (F-07). Solution: availability as a hard filter → FR-7.
  - `O-4` "Setting up a profile is tedious and feels risky" (F-04, F-05). Solution: optional archive import → FR-5, FR-13.
- **Page layout** (`discovery.astro`), in this order:
  1. Intro with the survey stat `pct(nothingInCommonRate)` ("we had nothing in common").
  2. Personas: three cards with their job statement.
  3. Findings: the `DiscoveryFindings` island.
  4. Opportunity solution tree: nested `<ul>` (outcome → opportunity → solution → experiment), each solution showing its PRD refs as links to `/prd#FR-n`.
  5. Interviews: a list with anchors.
- **`DiscoveryFindings`** (`client:load`, no props, imports `FINDINGS`):
  - A row of tag buttons, "All" plus every tag used, ordered by count descending and then `byString`. The buttons use `aria-pressed` and `min-h-11`.
  - Single selection; "All" is the default and acts as the reset.
  - Each finding card has `data-testid="finding"` and `data-tags="<space-separated tags>"`, shows its tags, and links evidence ids to `#I-0n`.
  - A `<p aria-live="polite" className="sr-only">` announces "Showing n findings".

- [ ] **Step 1: Write the failing unit tests.** `discovery.test.ts`: 10 interviews with unique ids; the persona split is 4/3/3; 3 personas and 3 jobs, each job matching `/^When .+, I want to .+, so I can .+\.$/`; finding ids equal `F-01`…`F-11`; every finding has at least 2 evidence ids and at least 1 tag; every `FindingTag` is used at least once. `percent.test.ts`: for every file in `src/content/**/*.mdx`, `src/diagrams/*.mmd` and `src/data/{discovery,prd,backlog,api}.ts` that exists, `content.replace(/95% CI/g, "")` does not match `/\d\s?%/`. Use `existsSync`, so files from later tasks join the check automatically.
- [ ] **Step 2: Write the failing e2e** `discovery.spec.ts`. `/discovery` shows 10 elements matching `[id^="I-"]` inside the interviews section and 11 `finding` cards. Clicking the "privacy" button makes every visible card's `data-tags` contain `privacy`, with a count equal to `FINDINGS.filter(f => f.tags.includes("privacy")).length` (import the data). Clicking "All" restores 11.
- [ ] **Step 3: Run** both → FAIL.
- [ ] **Step 4: Implement** the data, island, page and the placeholder filter.
- [ ] **Step 5: Verify** `npx vitest run` → PASS (the opportunity `prdRefs` are not checked until Task 6 adds requirements), `npm run e2e` → PASS.
- [ ] **Step 6: Commit** `feat: discovery page with interviews, personas, JTBD, opportunity tree and tag filter`

---

### Task 5: ADR-003 to ADR-006 and the complete Decision Log

**Files:**
- Create: `src/content/adr/003-group-size.mdx`, `004-rules-before-ml.mdx`, `005-availability-hard-filter.mdx`, `006-raw-data-never-stored.mdx`
- Modify: `src/pages/decision-log/index.astro` (delete the `upcoming` array and its `<li>` block); `src/content/adr/001-data-portability.mdx` (change "the planned ADR-006 makes this a hard rule" to a link: `[ADR-006](/decision-log/006-raw-data-never-stored) makes this a hard rule`); `tests/unit/adr.test.ts`; `tests/unit/copy.test.ts`

**Interfaces:**
- Consumes: the ADR frontmatter schema from M1 (`number`, `title`, `status`, `date`, `tags`), the four required headings, and the finding ids from Task 4.
- Produces: ADR slugs `003-group-size`, `004-rules-before-ml`, `005-availability-hard-filter`, `006-raw-data-never-stored`. Task 6 cites them as `adrRefs: [3]` and so on.

Titles, verbatim from the old `upcoming` list: 3 "Groups of 4–6, not one-to-one"; 4 "Rule-based scoring before machine learning"; 5 "Availability is a hard filter, not a score"; 6 "Raw social data is never stored". `status: accepted`; `date`: the day of writing. Each ADR runs to about 350 words with Context → Options (≥ 2) → Decision → Consequences (at least one honest cost). Each links its discovery evidence (`/discovery#F-0n`).

What each ADR must argue. Each source listed below is a lead to verify, not a fact to copy:
- **003.** Groups of 4–6 lower the pressure for introverts and make meeting strangers safer (F-06). One bad match is diluted. The cost: scheduling is harder. Lead to verify: Dunbar, Duncan & Nettle (1995), "Size and structure of freely forming conversational groups", *Human Nature* 6(1), on conversations splitting above about four speakers. This supports the "small, splits naturally" design.
- **004.** Rules before ML: there are no training labels yet (F-09 is what creates them); the rules are explainable (FR-10) and deterministic (tests). The cost: hand-tuned weights. Lead to verify: Google's "Rules of Machine Learning", Rule #1 (developers.google.com/machine-learning/guides/rules-of-ml).
- **005.** Availability is a hard filter, not a score: a group that cannot meet is worth nothing whatever its score (F-07). It links to `filters.ts`. The cost: a smaller pool, which shows as unmatched users with an "availability" reason in the simulator. No external citation is needed. Do not quote a number unless it comes from `metrics.ts`.
- **006.** Raw archives are never stored: process in memory or an encrypted bucket with a deletion deadline, keep only allow-listed fields, and let the user confirm them. This links to the privacy data-flow diagram (`/technical-design#privacy-flow`). Leads to verify: GDPR Art. 5(1)(c) data minimisation and 5(1)(e) storage limitation; KVKK Art. 4(2) processing principles, from the official English text on kvkk.gov.tr.

- [ ] **Step 1: Update the tests first.** In `adr.test.ts`, replace "ADR-001 and ADR-002 exist" with `"ADR-001 to ADR-006 exist"`, asserting that the sorted `number` values equal `[1,2,3,4,5,6]`. Add `"ADR-003 to ADR-006 link a finding or another ADR, or cite a source"`: each of those four files (not 001/002) matches `/\/discovery#F-\d{2}|\/decision-log\/\d{3}-|https?:\/\//`. Add `"external links come with a checked-on date"`: a file containing `https://` also matches `/Sources checked on \d{1,2} \w+ \d{4}/`. In `copy.test.ts`, replace `ADR-001 refers to ADR-006 as planned` with `ADR-001 links ADR-006`: `expect(adr1).toMatch(/\]\(\/decision-log\/006-raw-data-never-stored\)/)`. Add `"Decision Log has no upcoming placeholders"`: `decision-log/index.astro` does not contain `coming in M2`.
- [ ] **Step 2: Run** `npx vitest run tests/unit/adr.test.ts tests/unit/copy.test.ts` → FAIL.
- [ ] **Step 3: Verify the sources.** Use WebSearch/WebFetch for every external claim before writing it. Record the URL and the exact supporting sentence in the hand-over notes folder, not in the repo. Drop any claim you cannot confirm.
- [ ] **Step 4: Write the four ADRs** and update ADR-001 and the Decision Log index.
- [ ] **Step 5: Verify** `npx vitest run` → PASS (including `percent.test.ts`), `npm run build` → PASS, and six ADRs listed at `/decision-log`.
- [ ] **Step 6: Commit** `feat: ADR-003 to ADR-006; decision log complete`

---

### Task 6: PRD in three versions

**Files:**
- Create: `src/data/prd.ts`, `src/content/prd/v0-1.mdx`, `v0-5.mdx`, `v1-0.mdx`, `src/components/PrdView.astro`, `src/pages/prd/[...version].astro`, `src/data/trace.ts`, `tests/e2e/prd.spec.ts`
- Modify: `src/lib/modules.ts` (add `"prd"` to `OWN_ROUTE`), `src/content.config.ts` (add the `prd` collection: `glob({ pattern: "*.mdx", base: "./src/content/prd" })`, schema `z.object({ version: z.enum(["0.1","0.5","1.0"]) })`), `tests/unit/prd.test.ts` (data tests)

**Interfaces:**
- Consumes: Task 3 (`requirementsAt`, `diffVersions`, `revisionErrors`, `CURRENT_PRD_VERSION`, `assertTraceable`); Task 4 `FINDINGS`, `INTERVIEWS`, `OPPORTUNITIES`.
- Produces:
  - `PRD_VERSIONS: PrdVersion[]` and `REQUIREMENT_REVISIONS: RequirementRevision[]`.
  - `caseTraceInput(adrNumbers: number[]): TraceInput` in `src/data/trace.ts`. It imports `BACKLOG` and `API_ENDPOINTS` once they exist. Until Tasks 7 and 9, pass `[]` for both, with a `// filled in Task 7 / Task 9` comment.
  - Routes `/prd` (v1.0), `/prd/v0-5` and `/prd/v0-1`. Each requirement row has `id="<FR-n>"`.

**Requirement history.** These are the IDs, titles, priorities, finding refs and ADR refs; the implementer writes each `text` in one or two sentences.

| id | v0.1 | v0.5 | v1.0 | findingRefs | adrRefs |
|---|---|---|---|---|---|
| FR-1 Choose an intent (friendship / networking / hobby partner) | must | = | = | F-08 | |
| FR-2 Pick at least 3 interests from a controlled list | must | = | = | F-01, F-02 | |
| FR-3 Add books and authors (Open Library search) | should | = | = | F-02 | |
| FR-4 Add profession, industry and schools | should | = | = | F-01 | |
| FR-5 v0.1: "Import profile from LinkedIn, Instagram and Goodreads APIs" → v0.5: "Optional data-archive import pre-fills onboarding; user confirms each field" | must | changed | = | F-04, F-05 | 1 |
| FR-6 "Shared-values matching (opt-in politics, religion)" | could | removed | — | F-01 | 2 |
| FR-7 v0.1: hard filters distance, language, age, intent → v1.0: adds shared availability | must | = | changed | F-07, F-08 | 5 |
| FR-8 v0.1: weighted score incl. availability overlap → v1.0: interests, books/authors, profession, schools only | must | = | changed | F-01, F-02 | 4 |
| FR-9 v0.1: groups of 4–6 → v1.0: honours size preference, diversity setting, members RSVP | must | = | changed | F-06 | 3 |
| FR-10 Show up to 3 "why this group" reasons | | must | = | F-02, F-03 | |
| FR-11 Tell unmatched users why, and waitlist them | | should | = | F-11 | |
| FR-12 Post-meetup rating, 1–5 | | must | = | F-09 | |
| FR-13 Delete the archive after extraction; keep allow-listed fields only | | must | = | F-05 | 6 |
| FR-14 "Would meet again" marks stored as a learning signal | | | must | F-09 | 4 |
| FR-15 Report or block a member, discreetly | | | must | F-10 | |
| FR-16 Venues are public places in a member's district | | | should | F-06 | |
| NFR-1 Never collect or infer special-category data | | must | = | | 2 |
| NFR-2 Matching is deterministic and every group is explainable | | | must | | 4 |
| NFR-3 Raw archives deleted within 1 hour of upload | | | must | | 6 |
| NFR-4 Onboarding meets WCAG 2.2 AA | | | should | | |

**Versions.**
- `0.1`: slug `v0-1`, status `draft`, stage "Problem framing, before discovery".
- `0.5`: slug `v0-5`, status `in review`, stage "After discovery and the data-source spike".
- `1.0`: slug `v1-0`, status `approved`, stage "Approved for build".

`changeNotes` are one sentence per changed ID and say *why*, naming the ADR or finding (for example "FR-6 removed: special-category data is out of scope (ADR-002)").

**MDX prose.**
- `v1-0.mdx` has `## Problem`, `## Goals and success metrics`, `## Non-goals`, `## Users`, `## Scope` and `## Open questions`, about 1,500 words. Earlier versions have at least `## Problem` and `## Goals and success metrics`. All three together come to about 2,500 words.
- Metrics are rendered by importing `storyMetrics`, `pct`, `TARGET_SECOND_MEETUP_RATE` and `ACTIVE_USERS` into the MDX. The North Star is second-meetup rate from {pct(secondMeetupRateV1)} to {pct(TARGET)}; the guardrails are onboarding completion, no-show rate and safety reports.

**Page** (`PrdView.astro`, props `{ version: PrdVersion; adrNumbers: number[] }`):
- A version switcher: `<nav aria-label="PRD version">` with three links. The current one has `aria-current="page"` and `min-h-11`.
- A status line: "v1.0 · approved · Approved for build".
- An "On this page" TOC built from `render(entry).headings` (depth 2), plus "Requirements" and "What changed".
- The MDX body, then a "Requirements" table (`requirementsAt`: ID, title, priority, text, linked findings, linked ADRs) inside an `overflow-x-auto` wrapper. Rows that `diffVersions(previous, this)` lists as added or changed get a "new" or "changed" badge.
- "What changed" shows `changeNotes` plus a computed line: "Added: …; Changed: …; Removed: …". It is omitted for v0.1.
- The page frontmatter calls `assertTraceable(caseTraceInput(adrNumbers))`, where `adrNumbers` comes from `getCollection("adr")`, and throws if `revisionErrors(REQUIREMENT_REVISIONS)` is non-empty.

- [ ] **Step 1: Write the failing data tests** in `prd.test.ts`:

```ts
test("revisions are well formed", () => expect(revisionErrors(REQUIREMENT_REVISIONS)).toEqual([]));
test("v0.1 → v0.5", () => expect(diffVersions(REQUIREMENT_REVISIONS, "0.1", "0.5")).toEqual({
  added: ["FR-10","FR-11","FR-12","FR-13","NFR-1"], removed: ["FR-6"], changed: ["FR-5"] }));
test("v0.5 → v1.0", () => expect(diffVersions(REQUIREMENT_REVISIONS, "0.5", "1.0")).toEqual({
  added: ["FR-14","FR-15","FR-16","NFR-2","NFR-3","NFR-4"], removed: [], changed: ["FR-7","FR-8","FR-9"] }));
test("every diffed id is explained in that version's change notes", () => { /* for 0.5 and 1.0: each id appears in some changeNotes entry */ });
test("each version has an MDX file", () => { /* PRD_VERSIONS.map(v => `src/content/prd/${v.slug}.mdx`) all exist */ });
test("case is traceable so far", () => {
  const adrs = readdirSync("src/content/adr").map(f => Number(f.slice(0, 3)));
  expect(traceabilityErrors(caseTraceInput(adrs))).toEqual([]);
});
```

  Rule 5 ("every FR covered by a story") would fail until Task 7 adds stories. While `backlog` is `[]`, skip rule 5 by asserting on `traceabilityErrors(...).filter(e => !e.includes("not covered by any story"))` here. Task 7 removes that filter.

- [ ] **Step 2: Write the failing e2e** `prd.spec.ts`:
  - `/prd` contains `#FR-16` and no `#FR-6`.
  - Clicking the "v0.1" switcher link lands on `/prd/v0-1`, where `#FR-6` is visible and `#FR-10` is absent.
  - `/prd/v0-5` shows a "changed" badge on the `FR-5` row.
  - The TOC link "Requirements" scrolls to `#requirements`.
- [ ] **Step 3: Run** both → FAIL.
- [ ] **Step 4: Implement** the data, MDX, component, page, `trace.ts` and the collection.
- [ ] **Step 5: Verify** `npx vitest run` → PASS; `npm run e2e` → PASS. Also check the opportunity tree on `/discovery`: every `/prd#FR-n` link resolves (covered by Task 10's link test).
- [ ] **Step 6: Commit** `feat: PRD v0.1, v0.5 and v1.0 with version switcher and computed change log`

---

### Task 7: Backlog with live RICE re-ranking

**Files:**
- Create: `src/data/backlog.ts`, `src/components/BacklogBoard.tsx`, `src/pages/backlog.astro`, `tests/unit/backlog.test.ts`, `tests/e2e/backlog.spec.ts`
- Modify: `src/lib/modules.ts` (add `"backlog"` to `OWN_ROUTE`), `src/domain/rice.ts`, `tests/unit/rice.test.ts`, `src/data/trace.ts` (use `BACKLOG`), `tests/unit/prd.test.ts` (drop the rule-5 filter)

**Interfaces:**
- Consumes: `riceScore`, `rankBacklog`; `useDebouncedValue` and `ANNOUNCE_DELAY_MS` (Task 2); `assertTraceable` and `caseTraceInput` (Tasks 3 and 6); `ACTIVE_USERS`; `pct`.
- Produces, in `rice.ts`:

```ts
export type RiceInputs = Pick<BacklogItem, "reach" | "impact" | "confidence" | "effort">;   // now exported
export type RiceOverrides = Record<string, Partial<RiceInputs>>;
export type RankedItem = { item: BacklogItem; score: number; rank: number; baseRank: number }; // ranks 1-based
export function sanitizeRiceInputs(i: RiceInputs): RiceInputs;   // reach/effort: non-finite or < 0 → 0
export function rerank(items: BacklogItem[], overrides: RiceOverrides): RankedItem[]; // ordered by rank; baseRank = rank with no overrides
```

- `BACKLOG: BacklogItem[]` holds 6 epics, 22–28 stories and 12–18 tasks.

**Epics and the requirements their stories must cover.** Each story's `prdRef` is one of its epic's FRs.

| id | epic | FRs |
|---|---|---|
| E-01 | Rich Profile | FR-1, FR-2, FR-3, FR-4 |
| E-02 | Data Import | FR-5, FR-13 |
| E-03 | Matching Engine v2 | FR-7, FR-8, FR-9 |
| E-04 | Match Explanation | FR-10, FR-11 |
| E-05 | Feedback Loop | FR-12, FR-14 |
| E-06 | Safety | FR-15, FR-16 |

Every story has a `userStory` ("As a …, I want …, so that …") and 2–4 `acceptanceCriteria`. Tasks are engineering work items under stories (for example "Parser fixtures for the Instagram export") and carry no `prdRef`. `reach` is at most `ACTIVE_USERS`. All four statuses are used by stories. `sprint` is set for `next`, `in_progress` and `done` items.

**`BacklogBoard`** (`client:load`, no props, imports `BACKLOG`):
- Controls:
  - "Show" `<select>` (All / Epics / Stories / Tasks, default Stories).
  - View toggle: two buttons, "List" and "Board", with `aria-pressed`.
  - "Reset", which clears overrides and keeps view and filter (`min-h-11 min-w-11`).
- Ranking is `rerank(filtered, overrides)`, so ranks are within the shown type.
- **List view:** an `<ol>` of rows with `data-testid="backlog-row"` and `data-id`. Each row shows:
  - rank, and a delta against `baseRank` ("▲2" / "▼1", with an `aria-label` like "up 2");
  - id, title and epic title;
  - inputs: Reach (`type=number min=0 step=50`), Impact (`<select>` 0.25, 0.5, 1, 2, 3), Confidence (`<select>` 0.5, 0.8, 1 labelled with `pct`), Effort (`type=number min=0 step=0.5`). Each input has an `aria-label` like `Reach for S-03`.
  - the score (`data-testid="score"`, one decimal), and the PRD link `/prd#FR-n`.
  - Rows are cards on narrow screens and grid columns from `md` up.
- **Board view:** four `data-testid="kanban-column"` sections in status order (Backlog, Next, In progress, Done). Each holds cards sorted by current score, with `data-score`. An empty column shows "Nothing here".
- A live region: `sr-only aria-live="polite"` with the debounced text `Ranking updated. #1 is <id> <title>.`

- [ ] **Step 1: Write the failing unit tests.** In `rice.test.ts`:

```ts
test("rerank without overrides matches rankBacklog", () => {
  const rr = rerank(items, {});
  expect(rr.map(x => x.item.id)).toEqual(rankBacklog(items).map(i => i.id));
  rr.forEach((x, i) => { expect(x.rank).toBe(i + 1); expect(x.baseRank).toBe(i + 1); });
});
test("an override moves an item and keeps its baseRank", () => {
  const last = rankBacklog(items).at(-1)!;
  const top = rerank(items, { [last.id]: { reach: 1e6 } })[0];
  expect(top.item.id).toBe(last.id); expect(top.rank).toBe(1); expect(top.baseRank).toBe(items.length);
});
test("rerank sanitises bad input", () => {
  const rr = rerank(items, { [items[0].id]: { reach: NaN, effort: -3 } });
  rr.forEach(x => expect(Number.isFinite(x.score)).toBe(true));
  expect(rr.map(x => x.rank).sort((a, b) => a - b)).toEqual(items.map((_, i) => i + 1));
});
test("rerank does not mutate", () => { /* deep-equal snapshot of items before/after */ });
```

  `backlog.test.ts` checks:
  - the counts (6 epics with the titles above; 22–28 stories; 12–18 tasks) and unique ids matching `/^(E|S|T)-\d{2}$/`;
  - each story's `prdRef` is in its epic's FR list from the table;
  - `reach <= ACTIVE_USERS`;
  - every story status is used;
  - `userStory` matches `/^As an? .+, I want .+, so that .+\.$/`.

  In `prd.test.ts`, remove the rule-5 filter so that the full `traceabilityErrors(caseTraceInput(adrs))` equals `[]`.
- [ ] **Step 2: Write the failing e2e** `backlog.spec.ts`:
  - **Re-rank and Reset:** read the first and last row `data-id`. Fill `Reach for <last>` with `999999` and expect the first row's `data-id` to equal the last id. Click Reset and expect the original first id.
  - **Clearing a field:** fill `Reach for <first>` with `""`. The page does not contain "NaN" or "Infinity", and that row's score is `0.0`.
  - **Board:** click "Board". There are 4 columns, and in each column `data-score` values are non-increasing.
  - **Empty columns:** select "Epics" and click "Board". Every column has at least one card or contains "Nothing here".
  - **PRD links resolve:** fetch `/prd`. Every `a[href^="/prd#"]` on `/backlog` and `/discovery` points to an id present in that HTML.
  - **Reset size:** the Reset `boundingBox` is at least 44×44.
- [ ] **Step 3: Run** both → FAIL.
- [ ] **Step 4: Implement** the `rice.ts` additions, the data, the island, and the page. `backlog.astro` has a short intro on RICE (formula, `effort` floor 0.5) and calls `assertTraceable(caseTraceInput(adrNumbers))` in its frontmatter. Wire `BACKLOG` into `trace.ts`.
- [ ] **Step 5: Verify** `npx vitest run` → PASS; `npm run e2e` → PASS. Then the **build-break check**: temporarily change one story's `prdRef` to `"FR-99"`. Expect `npx vitest run tests/unit/prd.test.ts` to fail, and `npm run build` to fail with `Broken traceability:` and `FR-99` in its output. Revert, and confirm `git diff --stat` shows no change to `backlog.ts`.
- [ ] **Step 6: Commit** `feat: backlog with live RICE re-ranking, list and board views`

---

### Task 8: Mermaid diagrams pre-rendered to SVG

**Files:**
- Create: `src/diagrams/system.mmd`, `src/diagrams/matching-run.mmd`, `src/diagrams/privacy-flow.mmd`, `scripts/render-diagrams.ts`, `scripts/diagram-hash.ts`, `src/data/diagrams.ts` (generated), `public/diagrams/*.svg` (generated), `src/components/Diagram.astro`, `tests/unit/diagrams.test.ts`
- Modify: `package.json` (dev dependency `mermaid-isomorphic`; script `"gen:diagrams": "tsx scripts/render-diagrams.ts"`)

**Why pre-rendered and committed:** Vercel's build image has no Chromium, and Mermaid needs a browser to lay out text. The spec's intent is that no Mermaid JavaScript ships to the client and the SVGs are produced by tooling, not drawn by hand. That still holds, and a hash test keeps the SVGs in sync with their sources, as `users.ts` is kept in sync with its seed.

**Interfaces:**
- Produces:
  - `export const DIAGRAMS: Record<DiagramName, { width: number; height: number; sourceHash: string }>` with `type DiagramName = "system" | "matching-run" | "privacy-flow"`.
  - `hashSource(text: string): string`, a sha256 hex (`node:crypto`) of the text with `\r\n` normalised to `\n`. It lives in its own module, `scripts/diagram-hash.ts`. Both the renderer and the test import it there; importing the renderer would run it.
  - `<Diagram name: DiagramName; title: string; description: string />` renders:

```html
<figure id={name}>
  <picture>
    <source srcset="/diagrams/<name>.dark.svg" media="(prefers-color-scheme: dark)">
    <img src="/diagrams/<name>.light.svg" alt={title} width height class="h-auto max-w-full" loading="lazy">
  </picture>
  <figcaption>…</figcaption>
</figure>
```

  The `<figcaption>` holds the title, an "Open full size" link to the light SVG, and a `<details><summary>Text description</summary>{description}</details>`.

**Script.** Use `createMermaidRenderer()` from `mermaid-isomorphic`; check the call shape against the package README for the installed version. For each `.mmd`, render twice, with `mermaidConfig: { theme: "default" }` and `{ theme: "dark" }`. Write `public/diagrams/<name>.light.svg` and `.dark.svg`. Write `src/data/diagrams.ts` with a "generated by scripts/render-diagrams.ts — do not edit" header, the width and height of the light render, and `hashSource` of the source. Exit non-zero if any render is rejected.

**Diagram content.**
- `system`: `flowchart LR`.
  - Nodes: Mobile app → API gateway → Profile service (Postgres), Import service (encrypted temp bucket), Matching job (weekly, runs `filters → score → grouping`), Notification service.
  - External: Sign in with LinkedIn, Open Library.
- `matching-run`: `sequenceDiagram`. Scheduler → Matching job: start week. The job loads opted-in profiles and runs the hard filters, then the score, then grouping. It writes groups plus reasons, notifies members, and the app calls `GET /v1/me/match`. Unmatched users get a reason and are waitlisted.
- `privacy-flow`: `flowchart TD`.
  - Archive upload → temp bucket (encrypted, deleted ≤ 1 h) → extractor (allow-list: interests, books, authors, schools, profession) → user confirms → profile DB.
  - A crossed edge "raw archive → never stored".
  - Analytics sees aggregates only.
  - Labels reference ADR-001, ADR-002 and ADR-006.

- [ ] **Step 1: Write the failing test** `diagrams.test.ts`:

```ts
const names = ["system", "matching-run", "privacy-flow"] as const;
test.each(names)("%s SVGs exist for both themes", n => {
  for (const t of ["light", "dark"]) expect(existsSync(`public/diagrams/${n}.${t}.svg`)).toBe(true);
});
test.each(names)("%s is up to date with its source", n =>
  expect(DIAGRAMS[n].sourceHash).toBe(hashSource(readFileSync(`src/diagrams/${n}.mmd`, "utf8"))));
test("no unexpected sources", () =>
  expect(readdirSync("src/diagrams").sort()).toEqual(names.map(n => `${n}.mmd`).sort()));
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/diagrams.test.ts` → FAIL.
- [ ] **Step 3: Implement** the sources, the script and the component. Run `npm i -D mermaid-isomorphic` and add `mermaid` only if npm reports it as a missing peer. Then run `npm run gen:diagrams`.
- [ ] **Step 4: Run** → PASS. Edit one character in `system.mmd`, re-run the test, and see "is up to date" FAIL. Revert and see it PASS.
- [ ] **Step 5: Commit** `feat: system, matching-run and privacy data-flow diagrams rendered to SVG`

---

### Task 9: API contract and the Technical Design page

**Files:**
- Create: `src/data/api.ts`, `src/components/ApiContract.astro`, `tests/unit/api.test.ts`
- Modify: `src/pages/technical-design.astro`, `src/data/trace.ts` (use `API_ENDPOINTS`)

**Interfaces:**
- Consumes: `ApiEndpoint` (Task 3), `Diagram` (Task 8), `caseTraceInput` (Task 6).
- Produces: `API_ENDPOINTS: ApiEndpoint[]` (exactly 6). Page anchors are `#architecture`, `#matching-run`, `#privacy-flow`, `#api` and `#simulator`.

**Endpoints.** Request and response bodies are JS objects rendered with `JSON.stringify(body, null, 2)`.

| method | path | purpose | prdRefs | example detail |
|---|---|---|---|---|
| PUT | `/v1/me/profile` | Save declared profile | FR-1, FR-2, FR-3, FR-4 | 422 when fewer than 3 interests |
| POST | `/v1/imports` | Upload a data archive | FR-5, FR-13 | 202 `{ importId, status: "processing" }`; 413 when the archive is too large |
| GET | `/v1/imports/{importId}` | Import status and extracted fields to confirm | FR-5, NFR-3 | `{ status: "ready", archiveDeleted: true, fields: {...} }` |
| GET | `/v1/me/match` | This week's group with reasons, or why unmatched | FR-10, FR-11 | group example: Thursday 19:30, Kadıköy, 5 people, 3 reasons in the "k of n …" format |
| POST | `/v1/groups/{groupId}/rsvp` | Join or decline | FR-9 | `{ response: "join" }`; 409 after the RSVP deadline |
| POST | `/v1/meetups/{meetupId}/feedback` | Rating and "would meet again" | FR-12, FR-14 | `{ rating: 4, wouldMeetAgain: ["u_…"] }` |

The section intro says every endpoint needs a session (Sign in with LinkedIn or email). It also says reporting (FR-15) is handled by the existing trust and safety service and sits outside this contract.

**Page.** Insert the following into `technical-design.astro` after the current engine intro, and add an "On this page" list linking the anchors:
- "Architecture": `<Diagram name="system">`.
- "Weekly matching run": `matching-run`.
- "Archive import and privacy": a short ingestion paragraph (upload → extract → delete, linking ADR-001 and ADR-006), then `privacy-flow`.
- "API contract": `<ApiContract />`, one `<article id="api-<method>-<slug>">` per endpoint. Each shows method and path, purpose, PRD links, request/response `<pre class="overflow-x-auto">` blocks, and an errors list.
- The simulator under `id="simulator"`.

Delete the sentence "System, sequence and privacy data-flow diagrams and the API contract are coming in milestone M2."

- [ ] **Step 1: Write the failing test** `api.test.ts`: exactly 6 endpoints; `method + path` unique; every path starts with `/v1/`; every endpoint has at least one `prdRefs` entry and at least one error. Add `"case is fully traceable"`: `traceabilityErrors(caseTraceInput(adrs))` equals `[]` with `API_ENDPOINTS` wired in. Moving it here from `prd.test.ts` is fine.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** the data, the component, the page sections and `trace.ts`.
- [ ] **Step 4: Verify** `npx vitest run` → PASS; `npm run e2e` → PASS. The existing `/technical-design` axe and 375px tests now cover the diagrams and `<pre>` blocks. In dark mode (Playwright `colorScheme: "dark"` or the OS setting), the diagrams show the dark variant.
- [ ] **Step 5: Commit** `feat: technical design diagrams and six-endpoint API contract`

---

### Task 10: Site integration and final checks

**Files:**
- Modify: `src/pages/index.astro` (tour + "coming soon"), `tests/e2e/pages.spec.ts` (routes), `README.md` (status, start-here links)

**Interfaces:**
- Consumes: `OWN_ROUTE` (Task 4), all routes above.

- [ ] **Step 1: Update `pages.spec.ts` routes** so that new pages are always covered. Build the list from `MODULES` plus `/prd/v0-1`, `/prd/v0-5`, and one `/decision-log/<file without .mdx>` per file in `src/content/adr`, read with `readdirSync`. Run `npm run e2e`. Fix any axe or 375px failure in components, not in tests.
- [ ] **Step 2: Overview.**
  - The tour lists, in order: Discovery ("Ten interviews, three personas and the opportunity tree behind v2"), PRD ("Three versions, and why each requirement changed"), Backlog ("Change a RICE input and watch the ranking move"), Technical Design ("Diagrams, the API contract and the Match Simulator"), Decision Log ("Six decisions, with what each one costs").
  - "Coming soon" (already filtered by `OWN_ROUTE` since Task 4) now lists only the M3 modules. Add a unit test asserting that `MODULES.filter(m => !OWN_ROUTE.has(m.slug))` has exactly the M3 slugs.
- [ ] **Step 3: README.** Set the M2 row to "Done". Add start-here bullets for traceability (`src/domain/traceability.ts`: "the build fails if a backlog item points at a requirement that doesn't exist") and diagrams (`npm run gen:diagrams`).
- [ ] **Step 4: Full verification.**
  - `npx vitest run` → all PASS.
  - `npm run build` → PASS.
  - `npm run e2e` → all PASS.
  - `grep -rn "coming in M2\|milestone M2" src` → no output.
- [ ] **Step 5: Commit** `chore: M2 integration: tour, routes, README`
- [ ] **Step 6: Owner actions (not automatable):**
  - Push, and confirm the Vercel deploy succeeds. It must not need Chromium; if it fails on Mermaid, the diagrams were not committed.
  - Run Lighthouse on `/backlog`, `/prd` and `/technical-design`. Performance and accessibility should be ≥ 90.
  - Read and rewrite the Discovery, PRD and ADR prose in your own voice.
