import { useState } from "react";
import { Tag } from "@carbon/react";
import { Book, Warning } from "@carbon/icons-react";
import RemoveIconButton from "@/shared/ui/RemoveIconButton";
import type { GroupSubject } from "@/features/curriculum/api/curriculum";

// Owns its own hover state so the page does not have to track a hovered id.
export default function SubjectCard({
  subject,
  onRemove,
}: {
  subject: GroupSubject;
  onRemove: () => void;
}) {
  const [hover, setHover] = useState(false);
  const extras = subject.medium_name || subject.prerequisite_note;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)} className={`os-subject-card${hover ? " is-hover" : ""}`}
    >
      <div className="os-flex os-items-center os-gap-2">
        <Book size={16} className="os-fill-accent os-shrink-0" />
        <div className="os-flex-1 os-min-w-0">
          <div className="os-text-sm os-fw-500 os-c-primary os-overflow-hidden os-truncate os-nowrap"
            title={subject.subject_name}
          >
            {subject.subject_name}
          </div>
          <div className="os-text-xs os-mono os-c-tertiary"
          >
            {subject.subject_code}
          </div>
        </div>
        <RemoveIconButton onClick={onRemove} />
      </div>

      {extras && (
        <div className="os-flex os-col os-gap-1">
          {subject.medium_name && (
            <div>
              <Tag type="purple" size="sm" className="os-m-0">
                {subject.medium_name} only
              </Tag>
            </div>
          )}
          {subject.prerequisite_note && (
            <p className="os-m-0 os-text-xs os-c-secondary os-flex os-gap-1"
            >
              <Warning size={12} className="os-fill-tertiary os-shrink-0" />
              {subject.prerequisite_note}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
