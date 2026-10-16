import { useState } from "react";
import type { Feedback, MeetupEvent, Member } from "../../domain/types";
import { formatWhen } from "./TableCard";

type Props = { event: MeetupEvent; me: Member; tablemates: Member[]; onSend: (f: Feedback) => void };

export default function FeedbackForm({ event, me, tablemates, onSend }: Props) {
  const [rating, setRating] = useState<Feedback["rating"] | null>(null);
  const [meetAgain, setMeetAgain] = useState<string[]>([]);
  const { day } = formatWhen(event.startsAt);

  return (
    <article className="rounded-3xl border border-line bg-surface p-6 md:p-8">
      <p className="text-xs font-medium uppercase tracking-wider text-accent">{day} · {event.venue.name}</p>
      <h1 className="mt-2 font-serif text-3xl font-semibold">How was it?</h1>
      <form className="mt-6 space-y-8" onSubmit={e => {
        e.preventDefault();
        if (rating) onSend({ eventId: event.id, memberId: me.id, rating, meetAgain });
      }}>
        <fieldset>
          <legend className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">Your evening</legend>
          <div className="flex gap-2">
            {([1, 2, 3, 4, 5] as const).map(n => (
              <label key={n} className={`flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border text-lg transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent ${rating !== null && n <= rating ? "border-accent bg-accent text-white" : "border-line hover:border-accent"}`}>
                <input type="radio" name="rating" value={n} className="sr-only" checked={rating === n} onChange={() => setRating(n)} />
                <span aria-hidden="true">★</span>
                <span className="sr-only">{n} out of 5</span>
              </label>
            ))}
          </div>
        </fieldset>

        {tablemates.length > 0 && (
          <fieldset>
            <legend className="mb-1 text-xs font-medium uppercase tracking-wider text-muted">Who would you like to meet again?</legend>
            <p className="mb-3 text-sm text-muted">Now you know their names. Tell us who you clicked with.</p>
            <div className="flex flex-wrap gap-2">
              {tablemates.map(t => (
                <label key={t.id} className={`cursor-pointer rounded-full border px-3.5 py-2 text-sm transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent ${meetAgain.includes(t.id) ? "border-accent bg-accent text-white" : "border-line hover:border-accent"}`}>
                  <input type="checkbox" className="sr-only" checked={meetAgain.includes(t.id)}
                    onChange={() => setMeetAgain(l => (l.includes(t.id) ? l.filter(x => x !== t.id) : [...l, t.id]))} />
                  {t.firstName}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <button type="submit" disabled={rating === null}
          className="rounded-full bg-accent px-6 py-3 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40">
          Send
        </button>
      </form>
    </article>
  );
}
