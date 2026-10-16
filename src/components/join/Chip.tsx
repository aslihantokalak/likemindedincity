type Props = { label: string; selected: boolean; onToggle: () => void; id?: string; size?: "sm" | "md" };

/** A tap-to-select pill. Announces its state with aria-pressed. */
export default function Chip({ label, selected, onToggle, id, size = "md" }: Props) {
  return (
    <button
      type="button" id={id} aria-pressed={selected} onClick={onToggle}
      className={[
        "rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-3.5 py-2 text-sm",
        selected ? "border-accent bg-accent text-white" : "border-line bg-surface text-ink hover:border-accent",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
