interface Props {
  value: number;
  max: number;
  // Read by screen readers; the visible text next to the bar carries the same meaning.
  label: string;
  tone?: "accent" | "success" | "warning";
  size?: "sm" | "md";
}

// A bar that never relies on colour alone: it exposes its value as a progressbar.
export default function ProgressBar({ value, max, label, tone = "accent", size = "md" }: Props) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      className={`os-progress os-progress--${size}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${value} of ${max} (${pct}%)`}
    >
      <div className={`os-progress__bar os-progress__bar--${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
