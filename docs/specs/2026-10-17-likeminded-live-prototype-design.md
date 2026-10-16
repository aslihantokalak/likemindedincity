# Likeminded Live Prototype: Design

**Date:** 2026-10-17
**Status:** Draft, awaiting owner review
**Amends:** `docs/specs/2026-10-16-likeminded-portfolio-design.md` (the "portfolio spec"). Where the two disagree, this document wins.
**Supersedes:** `docs/superpowers/plans/2026-10-16-m2-pm-backbone.md` (written against the portfolio spec before this revision; removed, still in git history at `b3f4fea`).

## 1. Intent

The portfolio spec built a case-study site *about* a product. The owner now wants the product itself as a **working prototype** that they, as the PM, can use end to end:

- a **member side** where someone signs up and is matched into a surprise meetup with like-minded strangers in their city, and
- an **admin portal** that only the owner opens: analytics on sign-ups and attendance, control over events and attendance, and Jira-style backlog and sprint planning.

It is an **open-source GitHub project**: anyone can clone it, run it locally and extend it. The owner is the primary user; interviewers may also click through it from the case-study site.

**Why:** a working product is stronger portfolio evidence than documents alone, and running the PM loop (signups → events → attendance → backlog → sprint) on it is the experience the owner wants to gain.

## 2. Goals, non-goals, anti-goals

**Goals**

- A member can sign up in about two minutes and immediately see either their surprise table or a friendly waitlist state.
- The owner can see, in the admin portal: total members, sign-ups in the last 7 days, active members, members who attended an event, latest sign-ups, busiest sign-up hours, members by city and district, and basic demographics.
- The owner can mark attendance per event and see the metrics change.
- The owner can create and edit epics, stories and tasks, rank the backlog, create sprints and move work through a sprint board.
- A developer can clone the repo, run `npm install && npm run dev`, and have everything working with realistic demo data.

**Non-goals**

- A real backend, real accounts or real authentication. Data lives in the visitor's browser.
- Real notifications (email, SMS, push).
- Real venue booking or payments.
- Mobile apps. The web app must work well on phones.
- Multiple admin users or roles.

**Anti-goals** (failure even if it technically works)

- It looks generated. The owner explicitly rejected the emoji-heavy direction because it "feels made by AI and nobody touched it". No emoji in the UI; every screen should feel deliberately designed.
- It pretends to be secure. The admin passcode must be described honestly as a gate, not as security.
- It breaks the case study's credibility: numbers that contradict each other, or behaviour that contradicts the ADRs (for example matching on sensitive attributes).

## 3. Decisions the owner made

- **Visual direction:** the "A + C" hybrid shown in brainstorming: warm editorial base (cream background, serif display headings, terracotta accent `#a63c26`, the existing site's tokens) with tap-to-select interest chips, soft rounded corners and a "surprise" moment. No emoji.
- **Location:** the member chooses their own location on the sign-up form. It is not limited to Istanbul.
- **Admin access:** only the owner sees the admin portal; it works "like an admin portal".
- **Admin analytics:** latest sign-ups; sign-ups in the last week; active users; event attendance; busiest sign-up hours; geographic and demographic breakdown.
- **Admin control:** the owner can control attendance, not only view it.
- **Jira-style tools:** creating a backlog and planning sprints.
- **Surprise:** members meet strangers for the first time at the venue.
- **Distribution:** open-source GitHub project others can develop further; the owner is the person testing it.

## 4. Calls made by Claude (owner may override while reviewing)

1. **UI language is English**, matching the case-study site and an international open-source audience. Turkish place names stay in Turkish.
2. **Location model:** a member picks one of Turkey's 81 provinces, then a district of that province. A "Use my location" link uses the browser's geolocation to preselect the nearest seeded city; the member can always change it. Cities outside Turkey are out of scope for now; the location data lives in one data file so a contributor can add countries.
3. **Matching filter change:** the portfolio spec's distance hard filter (12 km, by coordinates) becomes **same province**. Holding coordinates for every district of 81 provinces is not worth it. District still matters: the venue is placed in the members' most common district.
4. **Admin gate:** `/admin` asks for a passcode read from `PUBLIC_ADMIN_PASSCODE` (default `likeminded` in `.env.example`). Entering it stores a flag in `sessionStorage`. The login screen and README state plainly that this is not security: the code ships to the browser.
5. **Storage:** all state is kept in `localStorage` behind a `Store` interface (§7.2) so a contributor can swap in Supabase or another backend without touching UI code.
6. **Demo data:** on first load the store is seeded with about 300 synthetic members, past and upcoming events with attendance, and the case study's backlog and sprints. An admin "Reset demo data" action restores the seed.
7. **"Active member"** means a member who RSVP'd "I'm coming" to, or attended, any event in the last 30 days.
8. **The case-study Backlog module is replaced** by the live admin backlog. The case-study site's Backlog page links to it and shows a read-only snapshot of the **seed** backlog, rendered at build time.
9. **Members map onto the matching engine's `User`.** A new `Member` type extends the fields the form collects; an adapter `toMatchUser(member)` fills the rest: `languages` and `groupSizePref` and `schools` come from the new form fields (§5.1), `profession`/`industry` from the profession vocabulary entry (empty strings when skipped), `coords` is unused, and `persona` is optional on `User` (absent for real sign-ups; it was analytics-only anyway).
10. **Location rule is configurable.** `checkPair` takes a `locationRule: "distance" | "province"`. The live app uses `"province"`. The existing Match Simulator keeps `"distance"` and its 50 Istanbul users, so its story and the "most blocking filter" explanation stay valid; its tests are unchanged.
11. **New sign-ups can take open seats.** When a member signs up, the matcher first tries to seat them in an upcoming event in their province that has fewer than 6 seats taken (or fewer than 4 for a "Small" table) and whose members all pass `checkPair` with them, choosing the best fit; only then does it try to form a new table with unplaced members; otherwise the member is waitlisted. The seed leaves about 15% of each big city's members unplaced and several events with open seats, so the owner's test sign-ups usually get a table.
12. **"Not this time" and under-filled tables.** Declining releases the seat. If that leaves an event below 4 members, the matcher tries to backfill it from the province's unplaced pool; if it can't, the event stays and the admin Events list flags it "under-filled" so the owner can cancel it.
13. **Fast-forward for testing.** Event detail in the admin has "Mark as happened", which moves an upcoming event's `startsAt` to one hour ago and sets it `past`. This lets the owner try attendance, rating and "meet again" on their own sign-ups immediately.
14. **Feedback is stored and reported, not yet used for matching.** `Store` gains `saveFeedback(f: Feedback)` and `listFeedback()`, with `Feedback = { eventId, memberId, rating: 1–5, meetAgain: memberId[] }`. Analytics adds "Average meetup rating" and "Would meet someone again (%)". The second-meetup rate stays defined by attendance (§6.1). Using "meet again" picks in matching is a seeded backlog story, not built now.
15. **The admin is a sandbox and says so.** The admin header carries a "Sandbox · demo data" badge with a tooltip: the case study's figures (≈6,000 users, A/B arms of 1,200) describe the fictional company; the admin shows this browser's demo data, which the owner changes by using it. The seed is calibrated so its starting second-meetup rate is about 31%, but it is expected to drift.
16. **Seed generation and time.** The seed generator is deterministic and its output is committed (`src/data/seed.ts`), with every timestamp stored as an offset in minutes from a reference "now". `LocalStore` turns offsets into dates at first load. All date-dependent domain functions take `now` as a parameter, so unit and Playwright tests pin the clock.
17. **`Issue` replaces `BacklogItem`.** `Issue = { id, key: "LM-n", type: "epic" | "story" | "task", epicId?, title, description, userStory?, acceptanceCriteria: string[], points?: 1|2|3|5|8|13, reach, impact, confidence, effort, status: "todo" | "in_progress" | "done", sprintId?: string, rank: number }`. `riceScore`/`rankBacklog` are adapted to it and their tests updated. The backlog content (6 epics, ~25 stories) is drafted by the builder from the case study and reviewed by the owner, as the portfolio spec intended.

## 5. Member side (`/join`)

### 5.1 Sign-up form

Fields, in order:

| Field | Control | Rules |
|---|---|---|
| First name | text | required, 1–40 chars |
| Age | number | required, 18–99 |
| Province | select (81) | required |
| District | select (districts of the chosen province) | required |
| Intent | segmented control: Friendship / Networking / Hobby partner | required |
| Interests | tap-to-select chips from the controlled vocabulary | at least 3, at most 8 |
| Last book you couldn't put down | text with suggestions from the book vocabulary | optional; free text allowed |
| An idea you can't stop thinking about | short textarea | optional, max 200 chars; shown to tablemates as a conversation starter, never used for matching |
| When are you free? | multi-select chips of slots (Mon–Sun × morning/afternoon/evening) | at least 1 |
| Languages you can chat in | chips: Turkish, English, German, Arabic, Russian, Other | at least 1; Turkish preselected |
| Table size you enjoy | segmented: Small (4) / Up to 6 | required, default "Up to 6" |
| School | text with suggestions from the school vocabulary | optional |
| Profession | select from vocabulary (each entry carries its industry), with "Other" | optional |
| Consent | checkbox: "I understand this is a demo and my answers are stored only in this browser." | required |

Sensitive attributes (political views, religion, ethnicity, health) are never asked for (ADR-002).

### 5.2 What happens after "Set my table"

1. The member is saved with `createdAt = now`.
2. Matching runs for the member's province (§7.3).
3. The member sees one of two screens:
   - **Table set:** day and time, venue name and district, number of seats, the other seats shown as anonymous circles, and up to three "hints" from the match reasons ("Three of you love Tanpınar"). The idea field of tablemates is not shown until after the event. Buttons: "I'm coming" (records RSVP) and "Not this time" (releases the seat; the member returns to the pool).
   - **Waitlist:** "We need N more people in {Province} to set your first table. You're on the list." N is the number of extra compatible members the matcher would need.

### 5.3 After the event

When an event's time has passed, the member's `/join` home shows "How was it?" with a 1–5 rating and "Who would you like to meet again?" (tablemates' first names revealed now). This feeds the second-meetup metric.

### 5.4 The member's "session"

There are no accounts. The browser remembers the member id it created (in `localStorage`), so returning to `/join` shows that member's current state. A "Start over as someone new" link clears it, so the owner can test many sign-ups.

## 6. Admin portal (`/admin`)

Left navigation: **Analytics, Members, Events & attendance, Backlog, Sprints**, and at the bottom **Reset demo data**.

### 6.1 Analytics

| Widget | Definition |
|---|---|
| Members | count of members |
| Last 7 days | members with `createdAt` in the last 7 × 24 h |
| Active (30d) | §4 call 7 |
| Attended an event | members with at least one `attended` attendance record |
| Second-meetup rate | members who attended ≥ 2 events ÷ members who attended ≥ 1 (the North Star) |
| Latest sign-ups | 10 most recent: first name, district, province, relative time; updates when a new member signs up |
| Busiest sign-up hours | histogram of `createdAt` local hour (0–23); headline names the busiest 2-hour window |
| Members by province | horizontal bars, top 10 provinces; click a province to see its districts |
| Demographics | age bands (18–24, 25–34, 35–44, 45+), intent split, top 10 interests |
| Sign-ups over time | daily sign-ups, last 30 days |

All widgets compute from the store through pure functions in `src/domain/analytics/` so they are unit-testable. A date-range filter is not required.

### 6.2 Members

A searchable, sortable table: name, age, province, district, intent, interests, joined, events attended. Clicking a row opens a read-only detail panel. No editing.

### 6.3 Events & attendance

- List of events, upcoming first, then past; filter by province.
- Event detail: time, venue, district, members, match reasons, cohesion.
- For past events, each member has an attendance toggle: **Came / No-show / Unknown** (default Unknown). Changing it updates analytics immediately.
- The owner can cancel an upcoming event (members return to the pool) and can trigger "Run matching now" for a province.

### 6.4 Backlog

- Items are **epics**, **stories** and **tasks**, with Jira-style keys `LM-1`, `LM-2`, ….
- Story and task fields: title, description, user story ("As a … I want … so that …"), acceptance criteria (list), epic, story points (1, 2, 3, 5, 8, 13), RICE inputs (reach, impact, confidence, effort), status, sprint.
- Create, edit and delete items in a side panel.
- The backlog list is ranked by RICE using the existing `rankBacklog`; the owner can switch to manual order and drag to reorder. Manual order is stored.
- Filter by epic and status.

### 6.5 Sprints

- Create a sprint: name, goal, start and end dates, capacity in points.
- Sprint planning view: backlog on the left, sprint on the right; drag items into the sprint. A capacity meter shows committed / capacity and turns to the accent colour with a warning when over capacity.
- Start a sprint (only one active at a time); the active sprint shows a board with **To Do / In Progress / Done**; dragging a card changes its status.
- Complete a sprint: unfinished items return to the top of the backlog; the sprint records completed points (velocity), shown as a small chart of the last sprints.

## 7. Architecture

### 7.1 Placement

Same repo and Astro app as the case-study site. New routes: `/join` and `/admin/*`. Both are React islands (`client:load`) on Astro pages; they share the existing `src/domain` code. The case-study navigation gains a prominent "Try the product" link to `/join`.

### 7.2 Storage

```ts
interface Store {
  // members
  listMembers(): Member[]; addMember(m: NewMember): Member;
  // events
  listEvents(): MeetupEvent[]; saveEvent(e: MeetupEvent): void; deleteEvent(id: string): void;
  // attendance
  setAttendance(eventId: string, memberId: string, status: AttendanceStatus): void;
  setRsvp(eventId: string, memberId: string, rsvp: Rsvp): void;
  // feedback
  saveFeedback(f: Feedback): void; listFeedback(): Feedback[];
  // backlog and sprints
  listIssues(): Issue[]; saveIssue(i: Issue): void; deleteIssue(id: string): void;
  listSprints(): Sprint[]; saveSprint(s: Sprint): void;
  // lifecycle
  reset(): void; subscribe(listener: () => void): () => void;
}
```

`LocalStore` implements it with one versioned `localStorage` key per collection (`likeminded:v1:members`, …). On a version mismatch or corrupt JSON it falls back to the seed and logs a console warning. `subscribe` lets admin widgets update when the member side writes (same tab via an in-memory emitter, other tabs via the `storage` event).

### 7.3 Matching for events

- Reuse `src/domain/matching` with the live app's `locationRule: "province"` (§4 call 10) and seat-filling (§4 calls 11–12).
- Matching runs per province. On sign-up it follows §4 call 11. "Run matching now" in the admin forms new tables from all unplaced members of a province. Either way it returns new or updated events and the waitlisted members.
- An event's time is the next calendar occurrence of the group's shared slot, at least 48 hours from now. Its venue is drawn from a per-province venue list (`src/data/venues.ts`, a few venues per seeded city with a type: café, bookshop, park, studio, bar) choosing the type that best fits the group's top shared interest; provinces without venues get "a café in {district}".
- `MeetupEvent = { id, province, district, venue, startsAt, memberIds, reasons, cohesion, status: "upcoming" | "past" | "cancelled", rsvps, attendance }`.
- Existing upcoming events are never reshuffled when a new member signs up.

### 7.4 Location data

`src/data/locations.ts`: 81 provinces with their districts. Source it from a public dataset and record the source and licence in the file header; the builder must confirm the licence allows redistribution. If no suitable licence exists, fall back to provinces plus districts for the three seeded cities, with "Other district" elsewhere.

### 7.5 Seed data

Add `scripts/generate-seed.ts` (seeded, deterministic; output committed as `src/data/seed.ts` per §4 call 16) to produce about 300 members:

- About 80% in İstanbul, Ankara and İzmir (in that order of size); the rest spread over 8–10 other provinces, some with too few members, so waitlists appear.
- `createdAt` spread over the last 60 days relative to the seed's reference date, with an evening peak around 21:00–23:00.
- Past events for the last 6 weeks with attendance marked so that the second-meetup rate is close to the case study's v2 figure (31%), and upcoming events for the next two weeks.
- The backlog: the case study's 6 epics and about 25 stories with RICE inputs, plus 3 past sprints and 1 active sprint.

Relative dates are computed at seed time from "now", so the demo always looks current.

## 8. Quality

- **Unit tests (Vitest):** analytics definitions in §6.1 on fixed fixtures with a pinned `now`; event formation (province filter, slot choice ≥ 48 h, venue choice, seat-filling, backfill after a decline, no reshuffling of existing members); waitlist "N more" number; `toMatchUser` adapter; simulator tests still pass with `locationRule: "distance"`; store round-trip and corrupt-data fallback; sprint capacity and completion (unfinished items return to the backlog, velocity recorded).
- **End-to-end (Playwright):** sign up → table or waitlist screen; admin passcode gate; marking attendance changes "Attended an event"; create a story, add it to a sprint, move it to Done; Reset demo data.
- **Accessibility:** axe with no serious or critical violations on `/join` and every `/admin` page; all drag-and-drop actions also possible with the keyboard (move up / move down / move to sprint buttons).
- **Mobile:** `/join` designed for phones first; `/admin` usable at 375 px but optimised for desktop.
- Existing tests and CI keep passing.

## 9. Delivery order

Each step ends with the site live and working.

1. **Member app:** store, seed, location data, province filter in matching, sign-up, table/waitlist, RSVP, post-event rating.
2. **Admin portal:** passcode gate, analytics, members, events & attendance, reset.
3. **Jira tools:** backlog and sprints.
4. **Case-study content:** Discovery, PRD, ADR-003 to ADR-006 (plus a new ADR on browser-only storage and the passcode gate), retrospective; Wireframes and Prototype modules point to the live app; README and CONTRIBUTING updated; MIT licence added.

## 10. Left to the builder

- Component library choice inside the design tokens (hand-rolled components or a headless library), and the drag-and-drop library, provided keyboard alternatives exist.
- Chart rendering approach for the admin widgets.
- Exact copy beyond the strings quoted here, in the same warm, plain voice.
- Exact venue names in `venues.ts` (fictional or generic names are fine; do not use real businesses' branding).
