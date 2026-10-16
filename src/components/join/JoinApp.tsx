import { useState } from "react";
import type { Feedback, NewMember } from "../../domain/types";
import { currentEventFor, declineSeat, seatMember, waitlistNeeded } from "../../domain/live/events";
import { DEFAULT_WEIGHTS } from "../../domain/matching";
import { useStore } from "../../store/use-store";
import FeedbackForm from "./FeedbackForm";
import SignupForm from "./SignupForm";
import TableCard from "./TableCard";
import WaitlistCard from "./WaitlistCard";

const newId = () => crypto.randomUUID();

export default function JoinApp() {
  const store = useStore();
  const [declined, setDeclined] = useState(false);
  const [lookingAgain, setLookingAgain] = useState(false);
  const now = new Date();
  const state = { members: store.listMembers(), events: store.listEvents() };
  const memberId = store.getCurrentMemberId();
  const me = memberId ? state.members.find(m => m.id === memberId) : undefined;

  function join(m: NewMember) {
    const member = store.addMember(m);
    const { events } = seatMember(member.id, { members: store.listMembers(), events: store.listEvents() }, new Date(), DEFAULT_WEIGHTS, newId);
    store.saveEvents(events);
    store.setCurrentMemberId(member.id);
    setDeclined(false);
    window.scrollTo({ top: 0 });
  }

  function startOver() {
    store.setCurrentMemberId(null);
    setDeclined(false);
    setLookingAgain(false);
    window.scrollTo({ top: 0 });
  }

  if (!me) {
    return (
      <>
        <header className="mb-10">
          <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            Find your people,<br />wherever you live.
          </h1>
          <p className="mt-4 max-w-md text-lg text-muted">
            Tell us what you love. We'll set the table, and keep the guest list a surprise.
          </p>
        </header>
        <SignupForm onSubmit={join} />
      </>
    );
  }

  const event = currentEventFor(me.id, state, now);
  const isPast = event !== undefined && new Date(event.startsAt) <= now;
  const gaveFeedback = event !== undefined && store.listFeedback().some(f => f.eventId === event.id && f.memberId === me.id);

  let screen;
  if (event && !isPast) {
    screen = (
      <TableCard
        event={event}
        coming={event.rsvps[me.id] === "coming"}
        onComing={() => store.setRsvp(event.id, me.id, "coming")}
        onDecline={() => {
          store.saveEvents(declineSeat(event.id, me.id, state, now, DEFAULT_WEIGHTS));
          setDeclined(true);
        }}
      />
    );
  } else if (event && isPast && !gaveFeedback) {
    screen = (
      <FeedbackForm
        event={event} me={me}
        tablemates={event.memberIds.filter(id => id !== me.id).map(id => state.members.find(m => m.id === id)!).filter(Boolean)}
        onSend={(f: Feedback) => store.saveFeedback(f)}
      />
    );
  } else if (event && isPast && gaveFeedback && !lookingAgain) {
    screen = (
      <article className="rounded-3xl border border-line bg-surface p-6 md:p-8">
        <p className="text-xs font-medium uppercase tracking-wider text-accent">Thank you</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold">Glad you came, {me.firstName}.</h1>
        <p className="mt-3 text-lg">Ready for another table?</p>
        <button type="button"
          onClick={() => {
            store.saveEvents(seatMember(me.id, state, new Date(), DEFAULT_WEIGHTS, newId).events);
            setLookingAgain(true);
          }}
          className="mt-6 rounded-full bg-accent px-6 py-3 font-medium text-white hover:opacity-90">
          Find my next table
        </button>
      </article>
    );
  } else {
    screen = <WaitlistCard province={me.province} needed={waitlistNeeded(me.id, state, now)} declined={declined} />;
  }

  return (
    <>
      <p className="mb-4 text-sm text-muted">Hi {me.firstName}.</p>
      {screen}
      <p className="mt-10 text-center text-sm">
        <button type="button" onClick={startOver} className="text-muted underline underline-offset-2 hover:text-ink">
          Start over as someone new
        </button>
      </p>
    </>
  );
}
