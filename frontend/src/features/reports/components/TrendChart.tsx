import { useEffect, useRef, useState } from "react";
import { CHART_1 } from "@/features/reports/components/chartColors";
import { NoData } from "@/features/reports/components/ChartPrimitives";

interface Point { label: string; value: number }

const H = 180;
const PAD = { top: 12, right: 16, bottom: 26 };

// Rounds the top of the scale up to a tidy number (1, 2, 5 × 10ⁿ) so tick labels are whole and distinct.
function niceMax(v: number) {
  if (v <= 4) return Math.max(1, Math.ceil(v));
  const pow = 10 ** Math.floor(Math.log10(v));
  return ([1, 2, 5, 10].find((m) => m * pow >= v) ?? 10) * pow;
}

// Line + soft area over recessive gridlines, with a crosshair and tooltip on hover.
// Measures its own width so the 2px line and 8px marker stay crisp at any size.
export default function TrendChart({
  points,
  min = 0,
  max,
  color = CHART_1,
  formatValue = (v) => `${v}`,
  formatAxis = (v) => `${v}`,
  empty,
}: {
  points: Point[];
  min?: number;
  max?: number;
  color?: string;
  formatValue?: (v: number) => string;
  formatAxis?: (v: number) => string;
  empty?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (points.length === 0) return <NoData>{empty}</NoData>;

  const hi = max ?? niceMax(Math.max(...points.map((p) => p.value)));
  const range = hi - min || 1;
  // Three gridlines when they land on whole numbers, otherwise just the bottom and top.
  const ticks = range % 2 === 0 || max !== undefined ? [min, min + range / 2, hi] : [min, hi];
  const padLeft = 16 + Math.max(...ticks.map((t) => formatAxis(t).length)) * 7;
  const innerW = Math.max(0, width - padLeft - PAD.right);
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => padLeft + (points.length > 1 ? (i / (points.length - 1)) * innerW : innerW / 2);
  const y = (v: number) => PAD.top + innerH - ((v - min) / range) * innerH;
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${y(min)} L${x(0).toFixed(1)},${y(min)} Z`;
  // Label the first, middle and last points only, so the axis never crowds.
  const xLabels = points.length > 2 ? [0, Math.floor((points.length - 1) / 2), points.length - 1] : points.map((_, i) => i);

  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - rect.left) / Math.max(1, rect.width);
    setHover(Math.round(rel * (points.length - 1)));
  };
  const h = hover !== null ? points[hover] : null;

  return (
    <div ref={ref} className="os-trend">
      {width > 0 && (
        <svg width={width} height={H} role="img" aria-label={`Trend from ${points[0].label} to ${points[points.length - 1].label}`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padLeft} x2={width - PAD.right} y1={y(t)} y2={y(t)} className="os-trend__grid" />
              <text x={padLeft - 10} y={y(t)} textAnchor="end" dominantBaseline="central" className="os-trend__axis">{formatAxis(t)}</text>
            </g>
          ))}
          {xLabels.map((i) => (
            <text key={i} x={x(i)} y={H - 6} textAnchor={points.length === 1 ? "middle" : i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} className="os-trend__axis">{points[i].label}</text>
          ))}
          <path d={area} style={{ fill: color }} className="os-trend__area" />
          <path d={line} style={{ stroke: color }} className="os-trend__line" />
          {/* Few points (e.g. one school year so far): mark each so a lone value is still visible. */}
          {points.length <= 12 && points.map((p, i) => <circle key={p.label} cx={x(i)} cy={y(p.value)} r={4} style={{ fill: color }} className="os-trend__dot" />)}
          {hover !== null && h && (
            <>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} className="os-trend__cross" />
              <circle cx={x(hover)} cy={y(h.value)} r={4.5} style={{ fill: color }} className="os-trend__dot" />
            </>
          )}
          <rect x={padLeft} y={0} width={innerW} height={H} fill="transparent" onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
        </svg>
      )}
      {hover !== null && h && (
        <div className="os-trend__tip" style={{ left: Math.min(Math.max(x(hover), 70), width - 70), top: y(h.value) - 12 }}>
          <span className="os-trend__tip-label">{h.label}</span>
          <strong>{formatValue(h.value)}</strong>
        </div>
      )}
    </div>
  );
}
