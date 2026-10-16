# Likeminded: a PM case study

Likeminded is a fictional social app that puts people in Istanbul into groups of 4–6 based on what they read, love and do. This site walks through how its second-meetup problem was found, specified, prioritised, designed, built and measured. It is a product management portfolio piece aimed at Technical PM roles.

**Live site:** (link added after deploy)

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
npm run gen:users  # regenerate the 50 synthetic users (seed 42)
```

## Status

| Milestone | Scope | Status |
|---|---|---|
| M1: Core | Overview, Match Simulator, ADR-001/002 | Done |
| M2: PM backbone | Discovery, PRD, Backlog with live RICE, ADR-003…006, diagrams | Planned |
| M3: Experience | Wireframes, Prototype, Analytics, Retrospective | Planned |

The design spec is in [`docs/specs/`](docs/specs/).
