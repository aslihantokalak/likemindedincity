import type { NewMember } from "../../domain/types";
import { seatMember } from "../../domain/live/events";
import { DEFAULT_WEIGHTS } from "../../domain/matching";
import { useStore } from "../../store/use-store";
import SignupForm from "./SignupForm";

export default function JoinApp() {
  const store = useStore();
  const memberId = store.getCurrentMemberId();

  function join(m: NewMember) {
    const member = store.addMember(m);
    const { events } = seatMember(member.id, { members: store.listMembers(), events: store.listEvents() }, new Date(), DEFAULT_WEIGHTS, () => crypto.randomUUID());
    store.saveEvents(events);
    store.setCurrentMemberId(member.id);
    window.scrollTo({ top: 0 });
  }

  if (!memberId) {
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

  return <p className="text-lg">You're in.</p>;
}
