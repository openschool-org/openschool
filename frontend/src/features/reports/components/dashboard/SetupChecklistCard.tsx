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
  if (doneCount === items.length) return null;


  return (
    <div className="os-section os-mb-6">
      <div className="os-section__header">
        <h2 className="os-section__title">Finish setting up</h2>
        <span className="os-section__meta">{doneCount} of {items.length} done</span>
      </div>
      <div className="os-p-4">
        <div className="os-mb-4">
          <ProgressBar value={doneCount} max={items.length} label="Setup progress" />
        </div>
        <div>
          {items.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              className={`os-list-row os-list-row--button${item.done ? " os-c-tertiary" : ""}`}
            >
              {item.done ? (
                <CheckmarkFilled size={16} className="os-fill-success os-shrink-0" />
              ) : (
                <CircleOutline size={16} className="os-fill-border-subtle os-shrink-0" />
              )}
              <span className="os-flex-1 os-text-sm">{item.label}</span>
              {!item.done && <ChevronRight size={16} className="os-c-tertiary os-shrink-0" />}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
