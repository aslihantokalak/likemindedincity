// Generates the live app's demo data: ~300 members, past events with attendance and feedback, upcoming events.
// Run `npm run gen:seed` to rewrite src/data/seed.ts. Deterministic: same seed number → same output.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Feedback, GroupSize, Intent, MeetupEvent, Member, SeedData } from "../src/domain/types";
import { declineSeat, formTables } from "../src/domain/live/events";
import { LIVE_SLOTS } from "../src/domain/live/slots";
import { SEEDED_CITIES } from "../src/domain/live/venues";
import { DEFAULT_WEIGHTS } from "../src/domain/matching";
import { districtsOf } from "../src/data/locations";
import { LANGUAGES } from "../src/data/live-vocab";
import { VENUES } from "../src/data/venues";
import { BOOKS, FIRST_NAMES, INTEREST_GROUPS, PROFESSIONS, SCHOOLS } from "../src/data/vocab";
import { int, mulberry32, pick, sample, weighted, type Rng } from "./rng";

/** Monday 00:00 in İstanbul. Event times are stored as minutes from here. */
export const SEED_REFERENCE = "2026-10-19T00:00:00+03:00";

const DAY_MIN = 1440;
const DAY_MS = 86_400_000;

const PROVINCE_COUNTS: [string, number][] = [
  ["İstanbul", 140], ["Ankara", 70], ["İzmir", 30], ["Bursa", 15], ["Antalya", 12], ["Eskişehir", 10],
  ["Trabzon", 6], ["Gaziantep", 5], ["Konya", 4], ["Samsun", 4], ["Muğla", 2], ["Van", 2],
];

// Sign-ups by local hour; the evening peak makes 21:00–23:00 the busiest window.
const HOUR_WEIGHTS = [2, 1, 1, 1, 1, 1, 2, 3, 5, 6, 6, 6, 7, 7, 6, 6, 6, 7, 8, 9, 10, 20, 20, 8];

// People are mostly free on weekday evenings and weekend daytime.
const SLOT_WEIGHTS = LIVE_SLOTS.map(s => {
  const [day, part] = s.split("_");
  const weekend = day === "sat" || day === "sun";
  if (part === "evening") return weekend ? 3 : 6;
  if (part === "afternoon") return weekend ? 6 : 1;
  return weekend ? 4 : 0.5;
});

const TASTES = Object.keys(INTEREST_GROUPS) as (keyof typeof INTEREST_GROUPS)[];

type SeedMember = SeedData["members"][number];

function makeMember(rng: Rng, index: number, province: string): SeedMember {
  const taste = pick(rng, TASTES);
  const other = pick(rng, TASTES.filter(t => t !== taste));
  const interests = [...sample(rng, INTEREST_GROUPS[taste], int(rng, 3, 5)), ...(rng() < 0.4 ? sample(rng, INTEREST_GROUPS[other], 1) : [])];

  const allDistricts = districtsOf(province);
  const venueDistricts = VENUES.map(v => v.district).filter(d => allDistricts.includes(d));
  const district = venueDistricts.length > 0 && rng() < 0.6 ? pick(rng, venueDistricts) : pick(rng, allDistricts);

  const slotCount = int(rng, 2, 4);
  const availability = new Set<string>();
  while (availability.size < slotCount) availability.add(LIVE_SLOTS[weighted(rng, SLOT_WEIGHTS)]!);

  const intent: Intent = (["friendship", "networking", "hobby_partner"] as const)[weighted(rng, [60, 25, 15])]!;
  const tableSize: GroupSize = rng() < 0.6 ? "medium" : "small";
  const languages = rng() < 0.35 ? [LANGUAGES[0]!, LANGUAGES[1]!] : [LANGUAGES[0]!];

  const m: SeedMember = {
    id: `s${String(index + 1).padStart(3, "0")}`,
    firstName: FIRST_NAMES[index % FIRST_NAMES.length]!,
    age: int(rng, 21, 45),
    province, district, intent, interests,
    availability: LIVE_SLOTS.filter(s => availability.has(s)),
    languages, tableSize,
    createdDaysAgo: Math.min(60, 1 + Math.floor(60 * Math.pow(rng(), 0.8))),
    createdMinuteOfDay: weighted(rng, HOUR_WEIGHTS) * 60 + int(rng, 0, 59),
  };
  if (rng() < 0.55) m.book = pick(rng, BOOKS).title;
  if (rng() < 0.7) m.profession = pick(rng, PROFESSIONS).profession;
  if (rng() < 0.5) m.school = pick(rng, SCHOOLS);
  return m;
}

const asMember = (m: SeedMember): Member => {
  const { createdDaysAgo: _d, createdMinuteOfDay: _m, ...rest } = m;
  return { ...rest, createdAt: "" };
};

export function generateSeed(seed: number): SeedData {
  const rng = mulberry32(seed);
  const ref = new Date(SEED_REFERENCE);
  let eventCounter = 0;
  const newId = () => `e${String(++eventCounter).padStart(3, "0")}`;
  const offsetOf = (iso: string) => Math.round((new Date(iso).getTime() - ref.getTime()) / 60_000);

  const members: SeedMember[] = [];
  for (const [province, count] of PROVINCE_COUNTS)
    for (let i = 0; i < count; i++) members.push(makeMember(rng, members.length, province));

  const events: (MeetupEvent & { startsOffsetMin: number })[] = [];

  // Past weeks: a different share of members turns up each week. Week i's tables are formed as if it were
  // 7i + 2 days before the reference, so every event lands at least 7 days before it.
  for (let week = 7; week >= 2; week--) {
    const now = new Date(ref.getTime() - (7 * week + 2) * DAY_MS);
    const eligible = members.filter(m => m.createdDaysAgo >= 7 * week + 3 && rng() < 0.55).map(asMember);
    for (const province of new Set(eligible.map(m => m.province))) {
      for (const e of formTables(province, { members: eligible, events: [] }, now, DEFAULT_WEIGHTS, newId)) {
        const attendance = Object.fromEntries(e.memberIds.map(id =>
          [id, (["came", "no_show", "unknown"] as const)[weighted(rng, [70, 20, 10])]!]));
        events.push({ ...e, status: "past", attendance, startsOffsetMin: offsetOf(e.startsAt) });
      }
    }
  }
  calibrateSecondMeetups(events);

  // Upcoming: hold back some members so they stay unplaced, form tables, then open a seat at a few tables.
  const heldBack = new Set(members.filter(m => SEEDED_CITIES.includes(m.province) && rng() < 0.12).map(m => m.id));
  const active = members.filter(m => !heldBack.has(m.id)).map(asMember);
  for (const province of PROVINCE_COUNTS.map(([p]) => p)) {
    const formed = formTables(province, { members: active, events: [] }, ref, DEFAULT_WEIGHTS, newId);
    let opened = 0;
    for (const formedEvent of formed) {
      let e = formedEvent;
      if (SEEDED_CITIES.includes(province) && opened < 3 && e.memberIds.length >= 5) {
        // Free one seat the same way a member declining would (reasons are recomputed; no backfill above 4).
        e = declineSeat(e.id, e.memberIds.at(-1)!, { members: active, events: [e] }, ref, DEFAULT_WEIGHTS)[0]!;
        opened++;
      }
      events.push({ ...e, startsOffsetMin: offsetOf(e.startsAt) });
    }
  }

  const feedback: Feedback[] = [];
  for (const e of events.filter(x => x.status === "past"))
    for (const id of e.memberIds.filter(x => e.attendance[x] === "came"))
      if (rng() < 0.6) {
        const mates = e.memberIds.filter(x => x !== id && e.attendance[x] === "came");
        feedback.push({
          eventId: e.id, memberId: id,
          rating: (int(rng, 3, 5) as Feedback["rating"]),
          meetAgain: sample(rng, mates, int(rng, 0, Math.min(2, mates.length))).sort(),
        });
      }

  return {
    members,
    events: events.map(({ startsAt: _s, ...e }) => e),
    feedback,
  };
}

/**
 * Nudges attendance so that (members who came twice or more) ÷ (members who came at least once) lands in
 * 28–34%, close to the case study's v2 figure. Deterministic: walks members and events in id order.
 */
function calibrateSecondMeetups(events: MeetupEvent[]) {
  const ratio = () => {
    const came = new Map<string, number>();
    events.forEach(e => Object.entries(e.attendance).forEach(([id, s]) => { if (s === "came") came.set(id, (came.get(id) ?? 0) + 1); }));
    const counts = [...came.values()];
    return { came, r: counts.filter(c => c >= 2).length / Math.max(1, counts.length) };
  };
  const ordered = [...events].sort((a, b) => a.id.localeCompare(b.id));
  for (let guard = 0; guard < 2000; guard++) {
    const { came, r } = ratio();
    if (r >= 0.28 && r <= 0.34) return;
    if (r > 0.34) {
      // Turn one later "came" of a repeat attendee into a no-show.
      const id = [...came].filter(([, c]) => c >= 2).map(([i]) => i).sort()[0]!;
      const e = [...ordered].reverse().find(x => x.attendance[id] === "came")!;
      e.attendance[id] = "no_show";
    } else {
      // Turn a no-show of a one-time attendee into "came".
      const e = ordered.find(x => Object.entries(x.attendance).some(([i, s]) => s === "no_show" && came.get(i) === 1));
      if (!e) return;
      const id = Object.entries(e.attendance).find(([i, s]) => s === "no_show" && came.get(i) === 1)![0];
      e.attendance[id] = "came";
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const data = generateSeed(2026);
  const out = `// Generated by scripts/generate-seed.ts (seed 2026). Do not edit by hand; run \`npm run gen:seed\`.\nimport type { SeedData } from "../domain/types";\n\nexport const SEED: SeedData = ${JSON.stringify(data, null, 1)};\n`;
  writeFileSync(new URL("../src/data/seed.ts", import.meta.url), out);
  const past = data.events.filter(e => e.status === "past").length;
  console.log(`Wrote ${data.members.length} members, ${past} past and ${data.events.length - past} upcoming events, ${data.feedback.length} feedback`);
}
