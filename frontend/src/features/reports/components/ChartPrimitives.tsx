import { ACCENT } from "@/features/reports/components/chartColors";
// Dependency-free chart primitives (hand-rolled SVG/CSS) shared by the dashboard and Analytics page.
import type { GrowthPoint } from "@/features/reports/api/dashboardAnalytics";
import SectionHeader from "@/shared/ui/SectionHeader";

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="os-section">
      <SectionHeader title={title} />
      <div className="os-section__body">{children}</div>
    </div>
  );
}

export function StatTile({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="os-bg-layer os-border os-py-5 os-px-6" style={{ borderTop: `3px solid ${color}` }}>
      <p className="os-mt-0 os-mx-0 os-mb-2 os-text-2xs os-fw-600 os-uppercase os-tracking-wide os-c-secondary">
        {label}
      </p>
      <p className="os-m-0 os-text-5xl os-fw-300 os-c-primary os-lh-1">{value}</p>
    </div>
  );
}

export function BarList({
  rows,
  color = ACCENT,
  formatValue,
}: {
  rows: { label: string; value: number }[];
  color?: string;
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="os-flex os-col os-gap-2h">
      {rows.map((r) => (
        <div key={r.label} title={`${r.label}: ${formatValue ? formatValue(r.value) : r.value}`}>
          <div className="os-flex os-justify-between os-text-xs os-mb-h">
            <span className="os-c-secondary">{r.label}</span>
            <span className="os-fw-600 os-c-primary">{formatValue ? formatValue(r.value) : r.value}</span>
          </div>
          <div className="os-h-px-6 os-bg-border-subtle os-rounded-md" aria-hidden="true">
            <div className="os-h-full os-rounded-md" style={{ width: `${(r.value / max) * 100}%`, background: color }} />
          </div>
        </div>
      ))}
      {rows.length === 0 && <p className="os-text-sm os-c-tertiary os-m-0">No data yet.</p>}
    </div>
  );
}

export function Sparkline({
  points,
  color = ACCENT,
  min,
  max,
  formatValue,
  emptyMessage = "No data yet.",
}: {
  points: { label: string; value: number }[];
  color?: string;
  min?: number;
  max?: number;
  formatValue?: (v: number) => string;
  emptyMessage?: string;
}) {
  if (points.length === 0) return <p className="os-text-sm os-c-tertiary os-m-0">{emptyMessage}</p>;
  const w = 100;
  const h = 32;
  const values = points.map((p) => p.value);
  const lo = min ?? Math.min(...values);
  const hi = max ?? Math.max(...values);
  const range = hi - lo || 1;
  const stepX = points.length > 1 ? w / (points.length - 1) : 0;
  const coords = points.map((p, i) => ({ x: i * stepX, y: h - ((p.value - lo) / range) * h }));
  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const fmt = formatValue ?? ((v: number) => `${v}`);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="os-w-full os-h-px-64">
      <path d={path} className="os-fill-none" style={{ stroke: color }} strokeWidth={2} vectorEffect="non-scaling-stroke" />
      {coords.map((c, i) => (
        <circle key={points[i].label} cx={c.x} cy={c.y} r={1.6} style={{ fill: color }}>
          <title>{`${points[i].label}: ${fmt(points[i].value)}`}</title>
        </circle>
      ))}
    </svg>
  );
}

export function TrendSummary({ title, points, color }: { title: string; points: GrowthPoint[]; color: string }) {
  const latest = points.length > 0 ? points[points.length - 1] : null;
  const prior = points.length > 1 ? points[points.length - 2] : null;
  const delta = latest && prior ? latest.count - prior.count : null;
  const deltaColor = !delta ? "var(--os-text-secondary)" : delta > 0 ? "var(--os-success)" : "var(--os-danger)";

  return (
    <Section title={title}>
      {latest ? (
        <>
          <div className="os-flex os-items-baseline os-gap-2h os-mb-3 os-wrap">
            <span className="os-text-4xl os-fw-300 os-c-primary os-lh-1">{latest.count}</span>
            <span className="os-text-xs os-c-tertiary">as of {latest.label}</span>
            {delta !== null && (
              <span className="os-text-xs os-fw-600 os-ml-auto" style={{ color: deltaColor }}>
                {delta > 0 ? "+" : ""}
                {delta} vs {prior!.label}
              </span>
            )}
          </div>
          <Sparkline
            points={points.map((p) => ({ label: p.label, value: p.count }))}
            color={color}
            formatValue={(v) => `${v}`}
          />
        </>
      ) : (
        <p className="os-text-sm os-c-tertiary os-m-0">No data yet.</p>
      )}
    </Section>
  );
}

export function DonutChart({
  slices,
  size = 140,
  thickness = 18,
}: {
  slices: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
}) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  return (
    <div className="os-flex os-items-center os-gap-6 os-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="os-shrink-0">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {total === 0 ? (
            <circle cx={size / 2} cy={size / 2} r={radius} className="os-fill-none os-stroke-border" strokeWidth={thickness} />
          ) : (
            slices.map((s) => {
              const fraction = s.value / total;
              const dash = fraction * circumference;
              const offset = -(cumulative / total) * circumference;
              cumulative += s.value;
              return (
                <circle
                  key={s.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius} className="os-fill-none" style={{ stroke: s.color }}
                  strokeWidth={thickness}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={offset}
                >
                  <title>{`${s.label}: ${s.value} (${Math.round(fraction * 100)}%)`}</title>
                </circle>
              );
            })
          )}
        </g>
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central" className="os-text-lg os-fw-600 os-fill-primary"
        >
          {total}
        </text>
      </svg>
      <div className="os-flex os-col os-gap-1h os-flex-1 os-min-w-8">
        {slices.map((s) => (
          <div key={s.label} className="os-flex os-items-center os-gap-2 os-text-xs">
            <span className="os-w-0h os-h-0h os-rounded-sm os-shrink-0" style={{ background: s.color }} />
            <span className="os-c-secondary">{s.label}</span>
            <span className="os-fw-600 os-c-primary os-ml-auto">
              {s.value}
              {total > 0 && ` (${Math.round((s.value / total) * 100)}%)`}
            </span>
          </div>
        ))}
        {slices.length === 0 && <p className="os-text-sm os-c-tertiary os-m-0">No data yet.</p>}
      </div>
    </div>
  );
}
