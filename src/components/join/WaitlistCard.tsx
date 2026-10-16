type Props = { province: string; needed: number; declined: boolean };

export default function WaitlistCard({ province, needed, declined }: Props) {
  return (
    <article className="rounded-3xl border border-line bg-surface p-6 md:p-8">
      <p className="text-xs font-medium uppercase tracking-wider text-accent">You're on the list</p>
      <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight">Your table is almost ready.</h1>
      <p className="mt-3 text-lg">
        We need {needed} more {needed === 1 ? "person" : "people"} in {province} to set your first table. You're on the list.
      </p>
      {declined && <p className="mt-3 text-muted">We'll find you another table soon.</p>}
    </article>
  );
}
