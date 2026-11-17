import { Alert, Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { Grade } from "@/features/academics/api/grade";
import type { ClassWithDetails } from "@/features/academics/api/class";
import type { useGradesPage } from "@/features/academics/hooks/useGradesPage";
import type { VisibleGrade } from "@/features/academics/lib/gradeFilter";
import GradeGroup, { GradeGroupSkeleton } from "@/features/academics/components/GradeGroup";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import EmptyState from "@/shared/ui/EmptyState";

interface Props {
  page: ReturnType<typeof useGradesPage>;
  visible: VisibleGrade[];
  filtering: boolean;
  onDeleteGrade: (g: Grade) => void;
  onDeleteClass: (c: ClassWithDetails) => void;
  onAddClass: (gradeId: string) => void;
  onEditClass: (c: ClassWithDetails) => void;
}

// Loading, error, empty and the grade list for the Grades & Classes page.
export default function GradesBody({ page, visible, filtering, onDeleteGrade, onDeleteClass, onAddClass, onEditClass }: Props) {
  const { orderedGrades } = page;
  const { reorder } = page.mutations;
  const busy = reorder.isPending;

  if (page.grades.isLoading || page.classes.isLoading) {
    return (
      <div className="os-flex os-col os-gap-4">
        {Array.from({ length: 4 }).map((_, i) => <GradeGroupSkeleton key={i} />)}
      </div>
    );
  }
  if (page.grades.isError || page.classes.isError) {
    return (
      <div>
        <ErrorMessage message="Could not load grades and classes." onRetry={() => { page.grades.refetch(); page.classes.refetch(); }} />
      </div>
    );
  }
  if (orderedGrades.length === 0) {
    return (
      <EmptyState
        title="No grades yet"
        description="Add the grades this school runs, then create classes under each one."
        action={<Button type="primary" icon={<PlusOutlined />} onClick={page.openCreateGrade}>Add grade</Button>}
      />
    );
  }

  return (
    <>
      {page.needsRenumber && (
        <div className="os-stack os-mb-4">
          <Alert
            type="warning"
            showIcon
            title={page.duplicateCount > 0 ? `${page.duplicateCount} grades share the same position` : "Positions have gaps"}
            description="Renumber them in the order shown below."
            action={
              <Button size="small" loading={busy} onClick={() => reorder.mutate(orderedGrades)}>
                {busy ? "Fixing…" : "Fix ordering"}
              </Button>
            }
          />
        </div>
      )}

      {visible.length === 0 && filtering && (
        <div className="os-section"><EmptyState title="No matching classes" description="Try another name or form teacher, or a different section." /></div>
      )}

      {visible.length > 0 && (
        <div className={`os-flex os-col os-gap-4${busy ? " os-opacity-60" : ""}`}>
          {visible.map(({ grade: g, index: i, classes: shown }) => (
            <GradeGroup
              key={g.id}
              grade={g}
              index={i}
              isLast={i === orderedGrades.length - 1}
              from={page.range.from}
              to={page.range.to}
              busy={busy}
              classes={shown}
              onMoveUp={() => page.move(i, -1)}
              onMoveDown={() => page.move(i, 1)}
              onEditGrade={() => page.openEditGrade(g)}
              onDeleteGrade={() => onDeleteGrade(g)}
              onDeleteClass={onDeleteClass}
              onAddClass={onAddClass}
              onEditClass={onEditClass}
              streamName={page.streamName}
              streamGroupName={page.streamGroupName}
              teacherName={page.teacherName}
            />
          ))}
        </div>
      )}
    </>
  );
}
