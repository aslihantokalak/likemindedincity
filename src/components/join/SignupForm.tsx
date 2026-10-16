import { useEffect, useRef, useState, type ReactNode } from "react";
import type { GroupSize, Intent, NewMember } from "../../domain/types";
import { validateSignup } from "../../domain/live/member";
import { LIVE_SLOTS } from "../../domain/live/slots";
import { nearestSeededCity } from "../../domain/live/venues";
import { PROVINCES, districtsOf } from "../../data/locations";
import { LANGUAGES } from "../../data/live-vocab";
import { VENUES } from "../../data/venues";
import { BOOKS, INTEREST_GROUPS, PROFESSIONS, SCHOOLS } from "../../data/vocab";
import Chip from "./Chip";

type Field = keyof NewMember | "consent";
type Errors = Partial<Record<Field, string>>;

const FIELD_ORDER: Field[] = [
  "firstName", "age", "province", "district", "intent", "interests", "book", "idea",
  "availability", "languages", "tableSize", "school", "profession", "consent",
];

const INTEREST_SECTIONS: { title: string; tags: readonly string[] }[] = [
  { title: "Out and about", tags: INTEREST_GROUPS.newcomer },
  { title: "Books and ideas", tags: INTEREST_GROUPS.introvert_reader },
  { title: "Work and building", tags: INTEREST_GROUPS.founder },
];

const INTENTS: { value: Intent; label: string }[] = [
  { value: "friendship", label: "Friendship" },
  { value: "networking", label: "Networking" },
  { value: "hobby_partner", label: "Hobby partner" },
];

const TABLE_SIZES: { value: GroupSize; label: string }[] = [
  { value: "small", label: "Small (4)" },
  { value: "medium", label: "Up to 6" },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PARTS = ["morning", "afternoon", "evening"];
const OTHER = "__other__";

const inputClass =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-base text-ink placeholder:text-muted " +
  "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 aria-[invalid=true]:border-accent";

const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter(v => v !== value) : [...list, value]);

/** First district of a city that has a venue, so "Use my location" lands somewhere we can seat people. */
const defaultDistrict = (province: string) =>
  VENUES.map(v => v.district).find(d => districtsOf(province).includes(d)) ?? districtsOf(province)[0] ?? "";

export default function SignupForm({ onSubmit }: { onSubmit: (m: NewMember) => void }) {
  const [firstName, setFirstName] = useState("");
  const [age, setAge] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [intent, setIntent] = useState<Intent | "">("");
  const [interests, setInterests] = useState<string[]>([]);
  const [book, setBook] = useState("");
  const [idea, setIdea] = useState("");
  const [availability, setAvailability] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>(["Turkish"]);
  const [tableSize, setTableSize] = useState<GroupSize>("medium");
  const [school, setSchool] = useState("");
  const [professionChoice, setProfessionChoice] = useState("");
  const [otherProfession, setOtherProfession] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [locating, setLocating] = useState<"idle" | "busy" | "failed">("idle");

  // Editing a field clears its error straight away; the rest stay until the next submit.
  const values: Record<Field, unknown> = {
    firstName, age, province, district, intent, interests, book, idea, availability, languages, tableSize, school,
    profession: [professionChoice, otherProfession], consent,
  };
  const previous = useRef(values);
  useEffect(() => {
    const changed = FIELD_ORDER.filter(f => previous.current[f] !== values[f] && JSON.stringify(previous.current[f]) !== JSON.stringify(values[f]));
    previous.current = values;
    if (changed.length > 0) setErrors(e => {
      const next = { ...e };
      changed.forEach(f => delete next[f]);
      if (changed.includes("province")) delete next.district;
      return next;
    });
  });

  function useMyLocation() {
    if (!("geolocation" in navigator)) { setLocating("failed"); return; }
    setLocating("busy");
    navigator.geolocation.getCurrentPosition(
      pos => {
        const city = nearestSeededCity([pos.coords.latitude, pos.coords.longitude]);
        setProvince(city);
        setDistrict(defaultDistrict(city));
        setLocating("idle");
      },
      () => setLocating("failed"),
      { timeout: 8000 },
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const profession = professionChoice === OTHER ? otherProfession : professionChoice;
    const result = validateSignup({
      firstName, age: age === "" ? undefined : Number(age), province, district,
      intent: intent || undefined, interests, book, idea, availability, languages, tableSize, school, profession,
    }, consent);
    if (!result.ok) {
      setErrors(result.errors);
      const first = FIELD_ORDER.find(f => result.errors[f]);
      if (first) document.getElementById(`f-${first}`)?.focus();
      return;
    }
    setErrors({});
    onSubmit(result.member);
  }

  const describedBy = (f: Field) => (errors[f] ? `e-${f}` : undefined);

  return (
    <form onSubmit={submit} noValidate className="space-y-9">
      <Section label="About you">
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <Labelled id="f-firstName" label="First name" error={errors.firstName}>
            <input id="f-firstName" className={inputClass} autoComplete="given-name" value={firstName}
              onChange={e => setFirstName(e.target.value)} aria-invalid={!!errors.firstName} aria-describedby={describedBy("firstName")} />
          </Labelled>
          <Labelled id="f-age" label="Age" error={errors.age}>
            <input id="f-age" className={inputClass} inputMode="numeric" value={age}
              onChange={e => setAge(e.target.value.replace(/\D/g, "").slice(0, 2))}
              aria-invalid={!!errors.age} aria-describedby={describedBy("age")} />
          </Labelled>
        </div>
      </Section>

      <Section label="Where do you live?">
        <div className="grid gap-3 sm:grid-cols-2">
          <Labelled id="f-province" label="City" error={errors.province}>
            <select id="f-province" className={inputClass} value={province}
              onChange={e => { setProvince(e.target.value); setDistrict(""); }}
              aria-invalid={!!errors.province} aria-describedby={describedBy("province")}>
              <option value="">Choose a city</option>
              {PROVINCES.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
          </Labelled>
          <Labelled id="f-district" label="District" error={errors.district}>
            <select id="f-district" className={inputClass} value={district} disabled={!province}
              onChange={e => setDistrict(e.target.value)}
              aria-invalid={!!errors.district} aria-describedby={describedBy("district")}>
              <option value="">{province ? "Choose a district" : "Choose a city first"}</option>
              {districtsOf(province).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </Labelled>
        </div>
        <p className="mt-2 text-sm">
          <button type="button" onClick={useMyLocation} disabled={locating === "busy"}
            className="text-accent underline underline-offset-2 disabled:opacity-60">
            {locating === "busy" ? "Finding you…" : "Use my location"}
          </button>
          {locating === "failed" && <span className="ml-2 text-muted" role="status">Couldn't get your location. Pick your city instead.</span>}
        </p>
      </Section>

      <ChoiceGroup id="f-intent" legend="What are you looking for?" error={errors.intent}>
        {INTENTS.map((o, i) => (
          <Chip key={o.value} id={i === 0 ? "f-intent" : undefined} label={o.label} selected={intent === o.value}
            onToggle={() => setIntent(o.value)} />
        ))}
      </ChoiceGroup>

      <ChoiceGroup id="f-interests" legend="What are you into?" hint={`${interests.length} selected · pick 3 to 8`} error={errors.interests}>
        <div className="w-full space-y-4">
          {INTEREST_SECTIONS.map((section, si) => (
            <div key={section.title}>
              <p className="mb-2 text-xs text-muted">{section.title}</p>
              <div className="flex flex-wrap gap-2">
                {section.tags.map((tag, ti) => (
                  <Chip key={tag} id={si === 0 && ti === 0 ? "f-interests" : undefined} label={capitalise(tag)}
                    selected={interests.includes(tag)} onToggle={() => setInterests(l => toggle(l, tag))} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </ChoiceGroup>

      <Section label="A little more about your mind">
        <div className="space-y-4">
          <Labelled id="f-book" label="The last book you couldn't put down" optional error={errors.book}>
            <input id="f-book" className={inputClass} list="books" value={book} onChange={e => setBook(e.target.value)}
              placeholder="e.g. Huzur" />
            <datalist id="books">{BOOKS.map(b => <option key={b.title} value={b.title}>{b.author}</option>)}</datalist>
          </Labelled>
          <Labelled id="f-idea" label="An idea you can't stop thinking about" optional error={errors.idea}
            hint="Your tablemates see this after you've met.">
            <textarea id="f-idea" className={`${inputClass} min-h-24 resize-y`} maxLength={200} value={idea}
              onChange={e => setIdea(e.target.value)} aria-invalid={!!errors.idea} aria-describedby={describedBy("idea")} />
            <p className="mt-1 text-right text-xs tabular-nums text-muted">{idea.length}/200</p>
          </Labelled>
        </div>
      </Section>

      <ChoiceGroup id="f-availability" legend="When are you free?" hint={`${availability.length} selected`} error={errors.availability}>
        <div className="w-full overflow-x-auto">
          <table className="w-full border-separate border-spacing-1.5 text-sm">
            <thead>
              <tr>
                <th className="w-12" />
                {PARTS.map(p => <th key={p} scope="col" className="text-left text-xs font-normal capitalize text-muted">{p}</th>)}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((d, di) => (
                <tr key={d}>
                  <th scope="row" className="pr-1 text-left text-xs font-normal text-muted">{d}</th>
                  {PARTS.map((p, pi) => {
                    const slot = LIVE_SLOTS[di * 3 + pi]!;
                    const on = availability.includes(slot);
                    return (
                      <td key={slot}>
                        <button type="button" id={di === 0 && pi === 0 ? "f-availability" : undefined} aria-pressed={on}
                          aria-label={`${d} ${p}`} onClick={() => setAvailability(l => toggle(l, slot))}
                          className={`h-9 w-full rounded-lg border text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${on ? "border-accent bg-accent text-white" : "border-line bg-surface hover:border-accent"}`}>
                          {on ? "Free" : ""}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChoiceGroup>

      <ChoiceGroup id="f-languages" legend="Languages you can chat in" error={errors.languages}>
        {LANGUAGES.map((l, i) => (
          <Chip key={l} id={i === 0 ? "f-languages" : undefined} label={l} selected={languages.includes(l)}
            onToggle={() => setLanguages(list => toggle(list, l))} />
        ))}
      </ChoiceGroup>

      <ChoiceGroup id="f-tableSize" legend="Table size you enjoy" error={errors.tableSize}>
        {TABLE_SIZES.map((o, i) => (
          <Chip key={o.value} id={i === 0 ? "f-tableSize" : undefined} label={o.label} selected={tableSize === o.value}
            onToggle={() => setTableSize(o.value)} />
        ))}
      </ChoiceGroup>

      <Section label="Work and school">
        <div className="grid gap-3 sm:grid-cols-2">
          <Labelled id="f-profession" label="What you do" optional>
            <select id="f-profession" className={inputClass} value={professionChoice} onChange={e => setProfessionChoice(e.target.value)}>
              <option value="">Prefer not to say</option>
              {PROFESSIONS.map(p => <option key={p.profession} value={p.profession}>{p.profession}</option>)}
              <option value={OTHER}>Other</option>
            </select>
            {professionChoice === OTHER && (
              <input aria-label="Your profession" className={`${inputClass} mt-2`} value={otherProfession}
                onChange={e => setOtherProfession(e.target.value)} placeholder="e.g. Potter" />
            )}
          </Labelled>
          <Labelled id="f-school" label="School" optional>
            <input id="f-school" className={inputClass} list="schools" value={school} onChange={e => setSchool(e.target.value)} />
            <datalist id="schools">{SCHOOLS.map(s => <option key={s} value={s} />)}</datalist>
          </Labelled>
        </div>
      </Section>

      <div>
        <label className="flex items-start gap-3 text-sm">
          <input id="f-consent" type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--accent)]" aria-invalid={!!errors.consent} aria-describedby={describedBy("consent")} />
          <span>I understand this is a demo and my answers are stored only in this browser.</span>
        </label>
        {errors.consent && <p id="e-consent" className="mt-1 text-sm text-accent">{errors.consent}</p>}
      </div>

      <button type="submit"
        className="w-full rounded-full bg-accent px-6 py-3.5 text-base font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-auto">
        Set my table
      </button>
    </form>
  );
}

const LABELS: Record<string, string> = { ai: "AI", saas: "SaaS" };
const capitalise = (s: string) => LABELS[s] ?? s.charAt(0).toUpperCase() + s.slice(1);

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">{label}</h2>
      {children}
    </section>
  );
}

function Labelled({ id, label, optional, hint, error, children }: {
  id: string; label: string; optional?: boolean; hint?: string; error?: string; children: ReactNode;
}) {
  const field = id.slice(2);
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}{optional && <span className="font-normal text-muted"> · optional</span>}
      </label>
      {hint && <p className="mb-1.5 text-xs text-muted">{hint}</p>}
      {children}
      {error && <p id={`e-${field}`} className="mt-1 text-sm text-accent">{error}</p>}
    </div>
  );
}

function ChoiceGroup({ id, legend, hint, error, children }: {
  id: string; legend: string; hint?: string; error?: string; children: ReactNode;
}) {
  const field = id.slice(2);
  return (
    <fieldset aria-describedby={error ? `e-${field}` : undefined}>
      <legend className="mb-3 flex w-full items-baseline justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wider text-muted">{legend}</span>
        {hint && <span className="text-xs tabular-nums text-muted">{hint}</span>}
      </legend>
      <div className="flex flex-wrap gap-2">{children}</div>
      {error && <p id={`e-${field}`} className="mt-2 text-sm text-accent">{error}</p>}
    </fieldset>
  );
}
