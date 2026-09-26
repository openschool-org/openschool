import { ClickableTile } from "@carbon/react";
import { CheckmarkFilled } from "@carbon/icons-react";
import { useClassMarks } from "@/features/marks/queries/useTermMarks";

interface Props {
  classId: string;
  className: string;
  gradeName: string;
  subjectId: string;
  termId: string;
  onOpen: () => void;
}

// One class card on the marks overview showing how many marks are entered.
export default function ClassSubjectCard({ classId, className, gradeName, subjectId, termId, onOpen }: Props) {
  const { data: rows, isLoading } = useClassMarks(classId, termId, subjectId);
  const total = rows?.length ?? 0;
  const entered = rows?.filter((r) => r.term_mark_id !== null).length ?? 0;
  const complete = total > 0 && entered === total;

  return (
    <ClickableTile onClick={onOpen} className="os-py-4 os-px-5">
      <div className="os-flex os-justify-between os-items-start os-gap-2">
        <div>
          <p className="os-mt-0 os-mx-0 os-mb-1 os-fw-600 os-text-md">{gradeName} - {className}</p>
          {isLoading ? (
            <p className="os-m-0 os-text-xs os-c-tertiary">Loading…</p>
          ) : (
            <p className={`os-m-0 os-text-xs ${complete ? "os-c-success" : "os-c-tertiary"}`}>{entered}/{total} marks entered</p>
          )}
        </div>
        {complete && <CheckmarkFilled size={18} className="os-fill-success os-shrink-0" />}
      </div>
    </ClickableTile>
  );
}
