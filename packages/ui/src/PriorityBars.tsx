export type PriorityLevel = 0 | 1 | 2 | 3 | 4;

const TONES: Record<PriorityLevel, string> = {
  0: "bg-priority-none",
  1: "bg-priority-low",
  2: "bg-priority-medium",
  3: "bg-priority-high",
  4: "bg-priority-urgent",
};

const HEIGHTS = [4, 7, 10];

/** Trois barrettes croissantes, colorées jusqu'au niveau de priorité. */
export function PriorityBars({ level, label }: { level: PriorityLevel; label?: string }) {
  return (
    <span className="inline-flex items-end gap-[2px]" title={label} aria-label={label}>
      {HEIGHTS.map((height, i) => (
        <span
          key={height}
          style={{ height }}
          className={`w-[3px] rounded-[1px] ${i < level ? TONES[level] : "bg-track"}`}
        />
      ))}
    </span>
  );
}
