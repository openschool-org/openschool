import { Card } from "antd";
import { CheckCircleFilled } from "@ant-design/icons";
import { useClassMarks } from "@/features/marks/queries/useTermMarks";
import { classLabel } from "@/shared/lib/classLabel";

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
    <Card
      className="os-click-card"
      role="button"
      tabIndex={0}
      aria-label={`Record marks for ${classLabel(gradeName, className)}`}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
    >
      <div className="os-flex os-justify-between os-items-start os-gap-2">
        <div>
          <p className="os-mt-0 os-mx-0 os-mb-1 os-fw-600 os-text-md">{classLabel(gradeName, className)}</p>
          {isLoading ? (
            <p className="os-m-0 os-text-xs os-c-tertiary">Loading…</p>
          ) : (
            <p className={`os-m-0 os-text-xs ${complete ? "os-c-success" : "os-c-tertiary"}`}>{entered}/{total} marks entered</p>
          )}
        </div>
        {complete && <CheckCircleFilled className="os-c-success os-shrink-0 os-text-lg" />}
      </div>
    </Card>
  );
}
