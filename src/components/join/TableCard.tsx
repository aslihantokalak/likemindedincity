import type { MeetupEvent } from "../../domain/types";

const WORDS = ["", "One", "Two", "Three", "Four", "Five", "Six"];

/** "3 of 5 read Huzur" → "Three of you read Huzur". */
export function asHint(reason: string): string {
  const m = /^(\d+) of \d+ (.*)$/.exec(reason);
  return m ? `${WORDS[Number(m[1])] ?? m[1]} of you ${m[2]}` : reason;
}

export function formatWhen(iso: string): { day: string; time: string } {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }),
    time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
  };
}

type Props = { event: MeetupEvent; coming: boolean; onComing: () => void; onDecline: () => void };

export default function TableCard({ event, coming, onComing, onDecline }: Props) {
  const { day, time } = formatWhen(event.startsAt);
  const others = event.memberIds.length - 1;
  return (
    <article className="rounded-3xl border border-line bg-surface p-6 shadow-[0_8px_30px_rgba(166,60,38,0.08)] md:p-8">
      <p className="text-xs font-medium uppercase tracking-wider text-accent">Your table is set</p>
      <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight md:text-4xl">{day}, {time}</h1>
      <p className="mt-2 text-muted">{event.venue.name} · {event.district}, {event.province}</p>
      <p className="mt-1 text-sm text-muted">{event.memberIds.length} seats · you and {others} {others === 1 ? "stranger" : "strangers"}</p>

      <div className="mt-6 flex gap-2" aria-hidden="true">
        {Array.from({ length: others }, (_, i) => (
          <span key={i} className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft font-serif text-lg text-accent">?</span>
        ))}
      </div>

      {event.reasons.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted">A few hints</h2>
          <ul className="mt-2 space-y-1 font-serif text-lg leading-snug">
            {event.reasons.map(r => <li key={r.text}>{asHint(r.text)}.</li>)}
          </ul>
          <p className="mt-3 text-sm text-muted">Names stay a surprise until you meet.</p>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button type="button" onClick={onComing} disabled={coming}
          className="rounded-full bg-accent px-6 py-3 font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-100">
          {coming ? "You're coming" : "I'm coming"}
        </button>
        <button type="button" onClick={onDecline}
          className="rounded-full px-4 py-3 text-sm text-muted underline-offset-2 hover:text-ink hover:underline">
          Not this time
        </button>
      </div>
    </article>
  );
}
