# Likeminded: a PM case study

Likeminded is a fictional social app that puts people in Istanbul into groups of 4–6 based on what they read, love and do. This site walks through how its second-meetup problem was found, specified, prioritised, designed, built and measured. It is a product management portfolio piece aimed at Technical PM roles.

**Live site:** https://likemindedincity.vercel.app

## Try the product

[`/join`](https://likemindedincity.vercel.app/join) is a working prototype of the member side:

1. Sign up with your city and district (any of Turkey's 81 provinces), what you're into, and when you're free.
2. You're seated at a surprise table with like-minded strangers, or put on a waitlist if your city doesn't have enough people yet.
3. Say "I'm coming", or "Not this time" to give your seat back. After a meetup you can rate it and say who you'd like to meet again.

It runs entirely in your browser: answers are kept in `localStorage`, next to ~300 demo members and their past and upcoming meetups. Nothing is sent anywhere. "Start over as someone new" lets you try it as several people. Everything goes through the `Store` interface in [`src/store/store.ts`](src/store/store.ts), so a real backend can replace `LocalStore` without touching the UI.

## Start here

- **The matching algorithm:** [`src/domain/matching/`](src/domain/matching/): hard filters → similarity score → greedy grouping, each a pure, tested function.
- **Decisions:** [`src/content/adr/`](src/content/adr/): why the app doesn't pull data from social media APIs, and why sensitive attributes are never used.
- **Numbers:** every percentage on the site is computed from raw counts in [`src/data/analytics.ts`](src/data/analytics.ts).

## Run it

```bash
npm install
npm run dev        # http://localhost:4321
npm test           # unit tests (Vitest)
npm run e2e        # end-to-end and accessibility tests (Playwright)
npm run gen:users  # regenerate the Match Simulator's 50 users (seed 42)
npm run gen:seed   # regenerate the live app's demo data (seed 2026)
npm run typecheck  # TypeScript type check
```

## Status

| Milestone | Scope | Status |
|---|---|---|
| M1: Core | Overview, Match Simulator, ADR-001/002 | Done |
| M2: PM backbone | Discovery, PRD, Backlog with live RICE, ADR-003…006, diagrams | Planned |
| M3: Experience | Wireframes, Prototype, Analytics, Retrospective | Planned |

The design spec is in [`docs/specs/`](docs/specs/).
