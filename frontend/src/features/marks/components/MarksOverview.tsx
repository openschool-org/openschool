import type { ReactNode } from "react";
import type { TeacherWorkloadRow } from "@/features/teachers/api/teacher";
import ClassSubjectCard from "@/features/marks/components/ClassSubjectCard";
import EmptyState from "@/shared/ui/EmptyState";

interface Props {
  workload: TeacherWorkloadRow[] | undefined;
  termId: string;
  termSelector: ReactNode;
  onOpen: (classId: string, subjectId: string) => void;
}

// Landing view: every subject the teacher takes, with one card per class.
export default function MarksOverview({ workload, termId, termSelector, onOpen }: Props) {
  const bySubject = new Map<string, { subjectId: string; subjectName: string; classes: { id: string; name: string; gradeName: string }[] }>();
  for (const r of workload ?? []) {
    if (!r.academic_year_is_current) continue;
    if (!bySubject.has(r.subject_id)) bySubject.set(r.subject_id, { subjectId: r.subject_id, subjectName: r.subject_name, classes: [] });
    bySubject.get(r.subject_id)!.classes.push({ id: r.class_id, name: r.class_name, gradeName: r.grade_name });
  }
  const subjects = [...bySubject.values()];

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">My subjects &amp; classes</h1>
          <p className="os-page__subtitle">Every subject and class you teach, with marks status for the selected term</p>
        </div>
      </div>

      <div className="os-section os-mb-6">
        <div className="os-section__header">{termSelector}</div>
      </div>

      {!termId ? (
        <EmptyState title="Choose a term" description="Select a term above to see marks status for your classes." />
      ) : subjects.length === 0 ? (
        <EmptyState title="No subjects assigned yet" description="Classes you teach a subject in will appear here once an admin assigns you." />
      ) : (
        subjects.map((subject) => (
          <div key={subject.subjectId} className="os-section os-mb-6">
            <div className="os-section__header">
              <h2 className="os-section__title">{subject.subjectName}</h2>
            </div>
            <div className="os-section__body os-grid os-grid-auto-16r os-gap-3h">
              {subject.classes.map((c) => (
                <ClassSubjectCard key={c.id} classId={c.id} className={c.name} gradeName={c.gradeName} subjectId={subject.subjectId} termId={termId} onOpen={() => onOpen(c.id, subject.subjectId)} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
