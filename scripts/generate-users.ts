// Generates the synthetic users for the Match Simulator.
// Run `npm run gen:users` to rewrite src/data/users.ts (seed 42, 50 users).
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Intent, User } from "../src/domain/types";
import {
  BOOKS, DISTRICTS, FAR_DISTRICT, FIRST_NAMES, INTEREST_GROUPS, PROFESSIONS, SCHOOLS, SLOTS,
} from "../src/data/vocab";

type Persona = NonNullable<User["persona"]>;

/** Small deterministic PRNG; never use Math.random here. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;
const int = (rng: Rng, min: number, max: number) => min + Math.floor(rng() * (max - min + 1));
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
function sample<T>(rng: Rng, xs: readonly T[], n: number): T[] {
  const pool = [...xs];
  const out: T[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
}

const RECIPES: Record<Persona, {
  count: number; intent: Intent; groupSizePref: User["groupSizePref"];
  slots: string[]; ages: [number, number];
  bookPool: string[]; bookCount: [number, number];
  jobs: string[]; districts: string[];
}> = {
  newcomer: {
    count: 17, intent: "friendship", groupSizePref: "medium",
    slots: ["fri_evening", "sat_afternoon", "sat_evening", "sun_morning", "sun_afternoon"],
    ages: [24, 34],
    bookPool: ["The Alchemist", "Sapiens", "Project Hail Mary", "Dune", "Atomic Habits", "The Bastard of Istanbul", "Istanbul: Memories and the City"],
    bookCount: [1, 3],
    jobs: ["Software Engineer", "Marketing Specialist", "Architect", "Doctor", "Teacher", "Chef", "Product Designer"],
    districts: ["Kadıköy", "Beşiktaş", "Beyoğlu", "Şişli", "Üsküdar"],
  },
  introvert_reader: {
    count: 16, intent: "friendship", groupSizePref: "small",
    slots: ["tue_evening", "wed_evening", "thu_evening", "sun_morning"],
    ages: [25, 37],
    bookPool: ["Madonna in a Fur Coat", "Kuyucaklı Yusuf", "The Time Regulation Institute", "Huzur", "Tutunamayanlar",
      "The Museum of Innocence", "Memed, My Hawk", "Selected Poems", "Human Landscapes from My Country",
      "Crime and Punishment", "The Brothers Karamazov", "Anna Karenina", "One Hundred Years of Solitude",
      "Kafka on the Shore", "Norwegian Wood", "The Stranger", "Mrs Dalloway", "Stoner"],
    bookCount: [3, 6],
    jobs: ["Editor", "Academic", "Teacher", "Journalist", "Lawyer", "Software Engineer", "Architect"],
    districts: ["Kadıköy", "Üsküdar", "Ataşehir", "Beyoğlu", "Fatih"],
  },
  founder: {
    count: 14, intent: "networking", groupSizePref: "medium",
    slots: ["mon_evening", "wed_evening", "thu_evening", "sat_morning"],
    ages: [26, 38],
    bookPool: ["Zero to One", "The Lean Startup", "Inspired", "The Mom Test", "Thinking, Fast and Slow",
      "The Hard Thing About Hard Things", "Shoe Dog", "Sapiens", "Atomic Habits"],
    bookCount: [2, 4],
    jobs: ["Founder", "Product Manager", "Software Engineer", "Investment Analyst", "Data Scientist", "Product Designer", "Banker"],
    districts: ["Beşiktaş", "Şişli", "Sarıyer", "Kağıthane", "Ataşehir"],
  },
};

const district = (name: string) => DISTRICTS.find(d => d.name === name)!;
const job = (profession: string) => PROFESSIONS.find(j => j.profession === profession)!;

function makeUser(rng: Rng, persona: Persona, index: number): User {
  const r = RECIPES[persona];
  const d = district(pick(rng, r.districts));
  const titles = sample(rng, r.bookPool, int(rng, r.bookCount[0], r.bookCount[1]));
  const books = BOOKS.filter(b => titles.includes(b.title));
  const ownInterests = sample(rng, INTEREST_GROUPS[persona], int(rng, 3, 5));
  const otherPersona = pick(rng, (Object.keys(INTEREST_GROUPS) as Persona[]).filter(p => p !== persona));
  const crossover = rng() < 0.5 ? sample(rng, INTEREST_GROUPS[otherPersona], 1) : [];
  const j = job(pick(rng, r.jobs));
  return {
    id: `u${String(index + 1).padStart(2, "0")}`,
    name: FIRST_NAMES[index % FIRST_NAMES.length],
    age: int(rng, r.ages[0], r.ages[1]),
    district: d.name,
    coords: d.coords,
    languages: rng() < 0.33 ? ["tr", "en"] : ["tr"],
    intent: r.intent,
    availability: [...sample(rng, r.slots, int(rng, 2, 3))].sort(),
    interests: [...ownInterests, ...crossover],
    books: books.map(b => b.title),
    authors: [...new Set(books.map(b => b.author))],
    profession: j.profession,
    industry: j.industry,
    schools: sample(rng, SCHOOLS, int(rng, 1, 2)),
    groupSizePref: r.groupSizePref,
    persona,
  };
}

const EDGE_USERS: User[] = [
  {
    id: "edge-no-slot", name: "Hakan", age: 31, district: "Kadıköy", coords: district("Kadıköy").coords,
    languages: ["tr"], intent: "friendship", availability: ["mon_morning"],
    interests: ["hiking", "photography", "coffee"], books: ["Sapiens"], authors: ["Yuval Noah Harari"],
    profession: "Accountant", industry: "finance", schools: ["Istanbul University"],
    groupSizePref: "medium", persona: "newcomer",
  },
  {
    id: "edge-english-only", name: "James", age: 29, district: "Beyoğlu", coords: district("Beyoğlu").coords,
    languages: ["en"], intent: "friendship", availability: ["fri_evening", "sat_evening"],
    interests: ["live music", "street food", "travel"], books: ["Dune"], authors: ["Frank Herbert"],
    profession: "Software Engineer", industry: "tech", schools: ["Koç University"],
    groupSizePref: "medium", persona: "newcomer",
  },
  {
    id: "edge-rare-intent", name: "Gül", age: 45, district: FAR_DISTRICT.name, coords: FAR_DISTRICT.coords,
    languages: ["tr"], intent: "hobby_partner", availability: ["sat_morning", "sun_morning"],
    interests: ["chess", "tea", "history"], books: ["Huzur"], authors: ["Ahmet Hamdi Tanpınar"],
    profession: "Teacher", industry: "education", schools: ["Ankara Fen Lisesi"],
    groupSizePref: "small", persona: "introvert_reader",
  },
];

/** `count` includes the three fixed edge-case users appended at the end. */
export function generateUsers(seed: number, count: number): User[] {
  const rng = mulberry32(seed);
  const randomCount = count - EDGE_USERS.length;
  const order: Persona[] = (Object.keys(RECIPES) as Persona[])
    .flatMap(p => Array<Persona>(RECIPES[p].count).fill(p))
    .slice(0, randomCount);
  return [...order.map((p, i) => makeUser(rng, p, i)), ...EDGE_USERS];
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const users = generateUsers(42, 50);
  const out = `// Generated by scripts/generate-users.ts (seed 42). Do not edit by hand; run \`npm run gen:users\`.\nimport type { User } from "../domain/types";\n\nexport const USERS: User[] = ${JSON.stringify(users, null, 2)};\n`;
  writeFileSync(new URL("../src/data/users.ts", import.meta.url), out);
  console.log(`Wrote ${users.length} users`);
}
