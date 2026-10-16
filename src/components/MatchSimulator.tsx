import { useMemo, useState } from "react";
import { buildGroups, DEFAULT_WEIGHTS, topBlockingFilter } from "../domain/matching";
import { pct } from "../domain/metrics";
import type { MatchWeights } from "../domain/types";
import { USERS } from "../data/users";
import { formatSlot } from "../lib/format";

const SLIDERS: { key: keyof MatchWeights; label: string; hint: string }[] = [
  { key: "interests", label: "Interests", hint: "Shared interest tags" },
  { key: "books", label: "Books", hint: "Shared books and authors" },
  { key: "profession", label: "Profession", hint: "Same job, or same industry" },
  { key: "schools", label: "Schools", hint: "Shared schools" },
  { key: "diversity", label: "Diversity", hint: "Reward people who bring new interests" },
];

const nameOf = new Map(USERS.map(u => [u.id, u.name]));

export default function MatchSimulator() {
  const [weights, setWeights] = useState<MatchWeights>(DEFAULT_WEIGHTS);
  const result = useMemo(() => buildGroups(USERS, weights), [weights]);
  const blocker = useMemo(() => (result.groups.length === 0 ? topBlockingFilter(USERS) : null), [result]);

  return (
    <section aria-labelledby="sim-title" className="rounded-xl border border-line bg-surface p-4 md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="sim-title" className="text-xl font-semibold">Match Simulator</h2>
        <button type="button" onClick={() => setWeights(DEFAULT_WEIGHTS)}
          className="rounded-md border border-line px-3 py-1 text-sm hover:bg-accent-soft">Reset</button>
      </div>
      <p className="mt-1 text-sm text-muted">{USERS.length} synthetic Istanbul users. Move a weight and the groups are rebuilt instantly.</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {SLIDERS.map(s => (
          <div key={s.key}>
            <label htmlFor={`w-${s.key}`} className="flex justify-between text-sm font-medium">
              <span>{s.label}</span><span className="tabular-nums text-muted">{weights[s.key].toFixed(2)}</span>
            </label>
            <input id={`w-${s.key}`} type="range" min={0} max={1} step={0.05} value={weights[s.key]}
              onChange={e => setWeights(w => ({ ...w, [s.key]: Number(e.target.value) }))}
              className="mt-1 w-full accent-[var(--accent)]" />
            <p className="text-xs text-muted">{s.hint}</p>
          </div>
        ))}
      </div>

      <p className="mt-6 text-sm font-medium" aria-live="polite">
        {result.groups.length} groups · {result.unmatched.length} unmatched of {USERS.length}
      </p>

      {result.groups.length === 0 ? (
        <p data-testid="empty-state" className="mt-3 rounded-lg bg-accent-soft p-4 text-sm">
          No groups formed with these settings. The filter blocking the most pairs is <strong>{blocker ?? "none"}</strong>.
        </p>
      ) : (
        <ul className="mt-3 grid gap-3 md:grid-cols-2">
          {result.groups.map((g, i) => (
            <li key={g.members.join("-")} data-testid="group-card" className="rounded-lg border border-line p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-semibold">Group {i + 1}</h3>
                <span className="text-xs text-muted">cohesion {pct(g.cohesion)}</span>
              </div>
              <p className="mt-1 text-sm text-muted">{formatSlot(g.slot)} · {g.venueDistrict} · {g.members.length} people</p>
              <p className="mt-2 text-sm">{g.members.map(id => nameOf.get(id)).join(", ")}</p>
              {g.reasons.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">Why this group</p>
                  <ul className="mt-1 space-y-0.5 text-sm">
                    {g.reasons.map(r => <li key={r.text}>· {r.text}</li>)}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {result.unmatched.length > 0 && (
        <details data-testid="unmatched" className="mt-5">
          <summary className="cursor-pointer text-sm font-medium">Unmatched ({result.unmatched.length}): the waiting list</summary>
          <ul className="mt-2 space-y-1 text-sm">
            {result.unmatched.map(u => (
              <li key={u.userId}><span className="font-medium">{nameOf.get(u.userId)}</span> <span className="text-muted">{u.reason}</span></li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
