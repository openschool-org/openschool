import { Link } from "react-router";
import { CheckmarkFilled, CircleOutline, ChevronRight } from "@carbon/icons-react";
import ProgressBar from "@/shared/ui/ProgressBar";

export interface SetupChecklistItem {
  label: string;
  done: boolean;
  path: string;
}

export default function SetupChecklistCard({ items }: { items: SetupChecklistItem[] }) {
  const doneCount = items.filter((i) => i.done).length;
  const nextItem = items.find((item) => !item.done);
  const progress = Math.round((doneCount / items.length) * 100);
  if (doneCount === items.length) return null;

  return (
    <div className="os-setup-checklist os-mb-6">
      <div className="os-setup-checklist__header">
        <div className="os-setup-checklist__heading">
          <div className="os-setup-checklist__icon"><CheckmarkFilled size={20} /></div>
          <div>
            <p className="os-eyebrow">Getting started</p>
            <h2>Finish setting up</h2>
            <p>Complete these essentials to get your school ready for daily use.</p>
          </div>
        </div>
        <div className="os-setup-checklist__progress-label"><strong>{progress}%</strong><span>{doneCount} of {items.length} complete</span></div>
      </div>
      <div className="os-setup-checklist__bar"><ProgressBar value={doneCount} max={items.length} label="Setup progress" /></div>
      {nextItem && <p className="os-setup-checklist__next">Next up: <Link to={nextItem.path}>{nextItem.label}</Link></p>}
      <div className="os-setup-checklist__items">
        {items.map((item) => (
          <Link key={item.label} to={item.path} className={`os-setup-checklist__item${item.done ? " is-complete" : ""}`}>
            <span className="os-setup-checklist__status">
              {item.done ? <CheckmarkFilled size={16} /> : <CircleOutline size={16} />}
            </span>
            <span className="os-setup-checklist__item-label">{item.label}</span>
            {!item.done && <ChevronRight size={16} className="os-setup-checklist__arrow" />}
          </Link>
        ))}
      </div>
    </div>
  );
}
