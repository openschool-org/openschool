import type { ReactNode } from "react";
import SectionCard from "@/shared/ui/SectionCard";

// A titled card of label and value pairs, the profile layout for students and teachers.
export default function KeyValueCard({ title, rows, footer }: { title: string; rows: [string, ReactNode][]; footer?: ReactNode }) {
  return (
    <SectionCard title={title} flush>
      <div className="os-kv-grid">
        {rows.map(([label, value]) => (
          <div key={label} className="os-kv-item">
            <p className="os-kv-item__label">{label}</p>
            <p className="os-kv-item__value">{value === null || value === undefined || value === "" ? "-" : value}</p>
          </div>
        ))}
      </div>
      {footer && <div className="os-section__body os-border-t">{footer}</div>}
    </SectionCard>
  );
}
