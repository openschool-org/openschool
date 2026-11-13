// Dependency-free chart primitives (hand-rolled SVG/CSS) for the Analytics page.
import type { ReactNode } from "react";
import { Card, Tooltip } from "antd";
import { CHART_1 } from "@/features/reports/components/chartColors";

// A titled chart card: title and optional subtitle on the left, a control or figure on the right.
export function ChartCard({ title, subtitle, extra, children, className }: { title: string; subtitle?: string; extra?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`os-chart-card${className ? ` ${className}` : ""}`}>
      <header className="os-chart-card__head">
        <div className="os-min-w-0">
          <h2 className="os-chart-card__title">{title}</h2>
          {subtitle && <p className="os-chart-card__subtitle">{subtitle}</p>}
        </div>
        {extra}
      </header>
      <div className="os-chart-card__body">{children}</div>
    </section>
  );
}

// A headline number: label, value, and an optional one-line context underneath.
export function KpiTile({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode }) {
  return (
    <Card className="os-dash-stat">
      <p className="os-dash-stat__label">{icon}{label}</p>
      <p className="os-dash-stat__value">{value}</p>
      {hint && <p className="os-dash-stat__meta">{hint}</p>}
    </Card>
  );
}

export function NoData({ children = "No data yet." }: { children?: ReactNode }) {
  return <p className="os-chart-empty">{children}</p>;
}

interface BarRow { label: string; value: number }

// Horizontal bars on one line each: label, bar, value. Rows become buttons when `onSelect` is given.
export function BarList({
  rows,
  color = CHART_1,
  max,
  formatValue = (v) => `${v}`,
  selected,
  onSelect,
  empty,
}: {
  rows: BarRow[];
  color?: string;
  max?: number;
  formatValue?: (v: number) => string;
  selected?: string;
  onSelect?: (label: string) => void;
  empty?: string;
}) {
  if (rows.length === 0) return <NoData>{empty}</NoData>;
  const top = max ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className={`os-bars${onSelect ? " is-selectable" : ""}`}>
      {rows.map((r) => {
        const content = (
          <>
            <span className="os-bars__label" title={r.label}>{r.label}</span>
            <span className="os-bars__track" aria-hidden="true">
              {r.value > 0 && <span className="os-bars__fill" style={{ width: `${Math.min(100, (r.value / top) * 100)}%`, background: color }} />}
            </span>
            <span className="os-bars__value">{formatValue(r.value)}</span>
          </>
        );
        return (
          <Tooltip key={r.label} title={`${r.label}: ${formatValue(r.value)}`} mouseEnterDelay={0.15}>
            <li>
              {onSelect ? (
                <button type="button" className={`os-bars__row${selected === r.label ? " is-active" : ""}`} aria-pressed={selected === r.label} onClick={() => onSelect(r.label)}>
                  {content}
                </button>
              ) : (
                <div className="os-bars__row">{content}</div>
              )}
            </li>
          </Tooltip>
        );
      })}
    </ul>
  );
}

// Part-to-whole ring with a 2px gap between segments, total in the middle, and a legend with counts and shares.
export function DonutChart({ slices, centerLabel = "total", size = 148, thickness = 16 }: { slices: { label: string; value: number; color: string }[]; centerLabel?: string; size?: number; thickness?: number }) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  if (slices.length === 0) return <NoData />;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const visible = slices.filter((s) => s.value > 0);
  const gap = visible.length > 1 ? 2 : 0;
  let cumulative = 0;

  return (
    <div className="os-donut">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="os-donut__ring" role="img" aria-label={`${total} ${centerLabel}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" className="os-donut__track" strokeWidth={thickness} />
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {total > 0 && visible.map((s) => {
            const dash = Math.max(0, (s.value / total) * circumference - gap);
            const offset = -(cumulative / total) * circumference;
            cumulative += s.value;
            return (
              <circle key={s.label} cx={size / 2} cy={size / 2} r={radius} fill="none" style={{ stroke: s.color }} strokeWidth={thickness} strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={offset}>
                <title>{`${s.label}: ${s.value} (${Math.round((s.value / total) * 100)}%)`}</title>
              </circle>
            );
          })}
        </g>
        <text x="50%" y="46%" textAnchor="middle" dominantBaseline="central" className="os-donut__total">{total}</text>
        <text x="50%" y="62%" textAnchor="middle" dominantBaseline="central" className="os-donut__caption">{centerLabel}</text>
      </svg>
      <ul className="os-legend">
        {slices.map((s) => (
          <li key={s.label} className="os-legend__item">
            <span className="os-legend__swatch" style={{ background: s.color }} aria-hidden="true" />
            <span className="os-legend__label">{s.label}</span>
            <span className="os-legend__value">{s.value}</span>
            <span className="os-legend__pct">{total > 0 ? `${Math.round((s.value / total) * 100)}%` : "–"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
