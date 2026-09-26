import type { TraceStep } from "@/features/workflows/api/workflows";

// What each step did and which backend tool it used, so a run shows its work.
export default function TraceList({ steps }: { steps: TraceStep[] }) {
  if (steps.length === 0) return null;
  return (
    <ol className="os-trace">
      {steps.map((s, i) => (
        <li key={`${s.key}-${i}`} className={s.ok ? "" : "is-failed"}>
          <span className="os-fw-600">{s.title}</span>
          <code className="os-trace__tool">{s.tool}</code>
          <span className="os-c-secondary">{s.detail}</span>
          <span className="os-c-tertiary os-text-xs">{s.duration_ms} ms</span>
        </li>
      ))}
    </ol>
  );
}
