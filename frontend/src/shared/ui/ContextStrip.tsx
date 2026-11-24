import type { ReactNode } from "react";

export interface ContextItem {
  key: string;
  label: string;
  value: ReactNode;
  meta?: ReactNode;
  // Extra content under the value, such as a term progress bar.
  extra?: ReactNode;
}

// "Where are we in the school year" row shared by every dashboard.
export default function ContextStrip({ items, label }: { items: ContextItem[]; label: string }) {
  return (
    <section className="os-dash-context" aria-label={label}>
      {items.map((item) => (
        <div key={item.key} className="os-dash-context__item">
          <p className="os-dash-context__label">{item.label}</p>
          <div className="os-dash-context__value">{item.value}</div>
          {item.extra}
          {item.meta && <p className="os-dash-context__meta">{item.meta}</p>}
        </div>
      ))}
    </section>
  );
}
