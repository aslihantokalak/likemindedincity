# Likeminded PM Portfolio: Design Spec

**Date:** 2026-10-16
**Status:** Draft, awaiting review

## 1. Purpose

A static web platform that showcases one end-to-end product management case study for a
fictional product, **Likeminded**. Its job is to help the owner pass **Technical PM**
interviews: an interviewer who opens the link should be able to follow
problem → discovery → PRD → backlog → wireframes → prototype → technical design → metrics
within five minutes, and drill into any step.

**Success criteria**

- Every claim in the case traces back through a chain: backlog item → PRD requirement → discovery finding.
- The matching algorithm is runnable in the browser and readable as a single module.
- Numbers never contradict each other across pages.
- The site is live on a public URL, works on a 375px phone screen, and scores ≥ 90 on Lighthouse performance and accessibility.

**Non-goals**

- A real, usable PM tool (no editors, no drawing tool, no accounts, no persistence).
- Real data ingestion from any social platform.
- More than one case study (the structure allows adding one later; it is not built now).
- Multi-language UI. All site content is in English.

## 2. The fictional product

**Likeminded** is a consumer social app that places people living in a city into groups of
4–6 based on interests, profession, books they read, schools, and intent, then sets a venue
and time for them to meet. The app creates the groups and events itself (a single-sided
model, similar to Timeleft); users do not create events and venues do not publish them.

**Story**

- v1 is live in **Istanbul** with ~6,000 active users. v1 matches only on age, district and five broad interests.
- 71% of users attend their first meetup; only **23% attend a second one**.
- In post-event surveys, the most common complaint (58%) is "we had nothing in common."
- The PM identifies **match quality** as the problem and designs **Match Quality v2**: richer profile signals, explainable matches ("why this group"), and a post-meetup feedback loop.

**Metrics**

- North Star: second-meetup attendance rate, target 23% → 35%.
- Guardrails: onboarding completion rate, no-show rate, safety reports.
- Outcome shown in the case: A/B test v1 vs v2, ~1,200 users per arm, second-meetup rate 23% → 31%. The 35% target is missed; onboarding completion drops 3 points. Both are discussed openly in the Retrospective.

### 2.1 Data source strategy

Pulling profile data from social platform APIs is not feasible for a consumer app:
LinkedIn's standard sign-in exposes only basic identity fields, Instagram's API for
personal accounts was retired, X read access is paid and inferring interests from posts
risks producing special-category data, and Goodreads no longer issues API keys.
ADR-001 records this, citing sources checked at the time it is written.

The chosen strategy has three layers:

1. **Declared data** (primary): onboarding picks for interests, books/authors, profession, schools, intent.
2. **Data portability import** (optional): the user uploads their own data export archive from Instagram, X or LinkedIn; the app extracts only the needed fields and deletes the archive.
3. **Open APIs**: Sign in with LinkedIn for identity, Open Library / Google Books for book metadata.

### 2.2 Matching parameters

- **Hard filters** (exclude on mismatch): city and distance radius, overlapping availability, shared language, age range, intent (friendship / networking / hobby partner).
- **Similarity signals** (weighted score): interests, books and authors, profession and industry, schools, group size preference.
- **Learning signal:** post-meetup ratings and "would meet again" marks (described in the case; not simulated).
- **User control:** a similarity ↔ diversity slider.
- **Never used:** political views, religion, ethnicity, health information.

## 3. Modules

The site has ten pages in a fixed left-hand navigation.

| # | Module | Content | Interaction |
|---|---|---|---|
| 1 | Overview | Problem, outcome metrics, five-minute guided tour | Static |
| 2 | Discovery | Synthesis of 10 fictional interviews; personas (new-in-town professional, introverted reader, networking founder); JTBD; opportunity solution tree | Filter findings by tag |
| 3 | PRD | Match Quality v2 PRD in versions v0.1, v0.5, v1.0 with change notes | Version switcher, table of contents |
| 4 | Backlog | 6 epics (Rich Profile, Data Import, Matching Engine v2, Match Explanation, Feedback Loop, Safety), ~25 stories, ~15 tasks | Edit RICE inputs → live re-ranking; list and kanban views; reset |
| 5 | Wireframes | 7 low-fi screens with design notes | Screen switcher, toggle notes |
| 6 | Prototype | 8-screen clickable flow: choose intent → add interests and books → optionally upload archive → group ready ("Thursday 19:30, Kadıköy, 5 people") → why this group → join → rate meetup | Click-through in a phone frame |
| 7 | Technical Design | Matching algorithm, ingestion pipeline (upload → extract → delete), API contract (6 endpoints), system / sequence / privacy data-flow diagrams, **Match Simulator** | Simulator: weight sliders regroup ~50 users and show reasons |
| 8 | Decision Log | ADR-001 Declared data + portability over APIs/scraping · ADR-002 Sensitive attributes excluded from matching · ADR-003 Groups of 4–6, not 1:1 · ADR-004 Rule-based scoring before ML · ADR-005 Availability as a hard filter, not a score · ADR-006 Raw social data is never stored | Static |
| 9 | Analytics | Activation funnel, second-meetup cohorts, A/B result with confidence interval, guardrails | Segment filter (persona, district) |
| 10 | Retrospective | What worked, what didn't, next steps | Static |

## 4. Architecture

**Stack:** Astro (static output) + React islands + TypeScript + Tailwind. Charts with
Recharts. Diagrams in Mermaid, rendered to SVG at build time. Wireframes drawn in
Excalidraw and committed as SVG alongside their source files.

```
likeminded-pm-portfolio/
├── src/content/        MDX content: prd/, adr/, discovery/, retro.mdx
├── src/data/           backlog.ts, users.ts, analytics.ts
├── src/domain/         pure logic, no UI imports
│   ├── rice.ts
│   ├── matching/       filters.ts, score.ts, grouping.ts
│   └── metrics.ts
├── src/components/     BacklogBoard, MatchSimulator, AnalyticsCharts,
│                       PrototypePlayer, WireframeViewer, PrdVersionSwitch
├── src/pages/          one page per module, shared layout with navigation
├── scripts/            generate-users.ts (seeded)
└── docs/specs/         this document
```

**Principle:** `src/domain/` never imports UI code. Components call domain functions and
render the results.

### 4.1 Matching engine

1. `filters.ts` — reduces the candidate pool with the hard filters.
2. `score.ts` — pairwise similarity: Jaccard similarity for interests, books/authors and schools; category match for profession/industry; weighted sum using `MatchWeights`. Returns the score **and** its per-signal contributions, which feed the "why this group" reasons.
3. `grouping.ts` — greedy grouping: seed with the most compatible pair, grow to 4–6 members. The diversity weight rewards some dissimilarity instead of maximizing cohesion alone. Users who cannot be placed are returned in `unmatched` with a reason.

The algorithm is deterministic: the same users and weights always produce the same groups
(ties broken by user id).

## 5. Data model

```ts
type Intent = "friendship" | "networking" | "hobby_partner";
type GroupSize = "small" | "medium";            // 4 | 5–6
type Slot = string;                             // e.g. "thu_evening", "sat_morning"

type User = {
  id: string; name: string; age: number;
  district: string; coords: [number, number];
  languages: string[];
  intent: Intent;
  availability: Slot[];
  interests: string[];                          // controlled vocabulary, ~40 tags
  books: string[]; authors: string[];
  profession: string; industry: string;
  schools: string[];
  groupSizePref: GroupSize;
  persona: "newcomer" | "introvert_reader" | "founder"; // analytics only
};

type MatchWeights = {
  interests: number; books: number; profession: number; schools: number;
  diversity: number;                            // 0–1
};

type Reason = { signal: keyof Omit<MatchWeights, "diversity">; text: string };

type Group = {
  members: string[];
  slot: Slot; venueDistrict: string;
  cohesion: number;
  reasons: Reason[];
};

type MatchResult = { groups: Group[]; unmatched: { userId: string; reason: string }[] };

type BacklogItem = {
  id: string; type: "epic" | "story" | "task"; parentId?: string;
  title: string; userStory?: string; acceptanceCriteria?: string[];
  reach: number;                                // users affected per quarter
  impact: 0.25 | 0.5 | 1 | 2 | 3;
  confidence: 0.5 | 0.8 | 1;
  effort: number;                               // person-weeks
  status: "backlog" | "next" | "in_progress" | "done";
  sprint?: number;
  prdRef?: string;                              // e.g. "FR-3"
};
```

RICE score = reach × impact × confidence / effort.

### 5.1 Synthetic data

- **Users:** ~50, produced by `scripts/generate-users.ts` with a fixed seed; output is committed. Users cluster around the three personas. Deliberate edge cases: a user with no overlapping availability, an English-only speaker, a user with a rare intent.
- **Analytics:** one file of raw counts (signups, first meetup, second meetup, A/B arms, guardrails). Every percentage on every page is computed from these counts by `metrics.ts`; no percentage is typed by hand.

### 5.2 Content inventory

| Module | Content | Size |
|---|---|---|
| Overview | Problem, outcome, tour | ~300 words |
| Discovery | 10 interview summaries, 3 personas, JTBD, opportunity tree | ~1,500 words |
| PRD | v1.0 full text, v0.1 and v0.5 with change notes | ~2,500 words |
| Backlog | 6 epics, ~25 stories, ~15 tasks | data file |
| Wireframes | 7 screens with notes | 7 SVGs |
| Prototype | 8-screen flow | React screens |
| Technical Design | Algorithm, pipeline, API, 3 diagrams, privacy flow | ~1,500 words |
| Decision Log | 6 ADRs (context → options → decision → consequences) | ~350 words each |
| Analytics | 4 charts with commentary | ~500 words |
| Retrospective | Worked / didn't / next | ~500 words |

Claude drafts all content; the owner reviews and rewrites it in their own voice so they can
defend every sentence in an interview.

## 6. Error handling and edge cases

- **Simulator, no groups formed:** show an explanatory message naming the filter that removed the most users, instead of an empty view.
- **Unknown route:** a 404 page linking back to the Overview.
- **Mobile:** every page readable at 375px width; the prototype is already phone-framed.
- **Interactive state:** simulator and backlog changes live in memory only and reset on reload; each has a Reset button.

## 7. Testing

| Layer | Tool | Checks |
|---|---|---|
| Domain logic | Vitest | RICE formula and stable sort; hard filters (no group contains users without a shared slot); grouping invariants (group size 4–6, each user in at most one group, every user is grouped or unmatched); determinism; matching never reads `persona` |
| Data consistency | Vitest | Funnel counts are monotonic (second ≤ first ≤ signups); story figures (71%, 23%, 31%) equal `metrics.ts` output |
| Content integrity | Astro content collections (Zod) | Required ADR sections present; every `prdRef` resolves to an existing PRD requirement; build fails on a broken reference |
| End to end | Playwright | All 10 pages load; moving a simulator slider changes groups; editing RICE re-ranks the backlog; the prototype flow completes |
| Accessibility | axe via Playwright | No serious or critical violations; keyboard navigation works |

## 8. Delivery

- Public GitHub repository. The README is the case entry point: three-sentence summary, live link, screenshot, pointer to `src/domain/matching/`.
- GitHub Actions runs tests and build on every push.
- Vercel deploys `main` automatically (free tier).

### 8.1 Milestones

Each milestone ends with the site live and working.

| Milestone | Scope |
|---|---|
| **M1: Core** | Project skeleton and navigation layout, `src/domain/` with tests, user generator, Match Simulator, Overview, ADR-001, ADR-002, CI, first deploy |
| **M2: PM backbone** | Discovery, PRD (three versions), Backlog with live RICE, ADR-003 to ADR-006, Technical Design diagrams and API contract |
| **M3: Experience** | Wireframes, Prototype, Analytics charts, Retrospective, README, polish to Lighthouse targets |
