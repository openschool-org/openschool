import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@carbon/react";
import { Search, EventSchedule } from "@carbon/icons-react";
import { useMyClasses } from "@/features/teachers/queries/useTeachers";
import { useStudentsByClass } from "@/features/students/queries/useStudents";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import EmptyState from "@/shared/ui/EmptyState";
import InfoRow from "@/shared/ui/InfoRow";
import DataGrid from "@/shared/ui/DataGrid";
import { capitalize } from "@/shared/lib/text";

export default function TeacherClasses() {
  const { classes: myClasses, isLoading, isError, refetch } = useMyClasses();
  const [activeClassId, setActiveClassId] = useState("");
  const [query, setQuery] = useState("");

  const activeClass = myClasses.find((c) => c.class_id === activeClassId) ?? myClasses[0];
  const { data: roster, isLoading: rosterLoading } = useStudentsByClass(activeClass?.class_id ?? "");

  if (isLoading) return <LoadingSpinner />;
  if (isError) {
    return (
      <div className="os-p-8">
        <ErrorMessage message="Failed to load your classes" onRetry={refetch} />
      </div>
    );
  }
  if (myClasses.length === 0 || !activeClass) {
    return (
      <div className="os-page">
        <EmptyState
          title="No classes assigned yet"
          description="Classes you teach will appear here once an admin assigns you to a subject in a class."
        />
      </div>
    );
  }

  const filtered = (roster ?? []).filter(
    (s) =>
      s.full_name.toLowerCase().includes(query.toLowerCase()) ||
      s.index_number.toLowerCase().includes(query.toLowerCase())
  );

  const houseCounts = new Map<string, number>();
  for (const s of roster ?? []) {
    const house = s.house_name ?? "No house";
    houseCounts.set(house, (houseCounts.get(house) ?? 0) + 1);
  }

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">My classes</h1>
          <p className="os-page__subtitle">{myClasses.length} class{myClasses.length > 1 ? "es" : ""} this year</p>
        </div>
      </div>

      <div className="os-flex os-gap-3 os-mb-6 os-wrap">
        {myClasses.map((c) => (
          <button
            key={c.class_id}
            onClick={() => { setActiveClassId(c.class_id); setQuery(""); }} className={`os-pill os-pill--solid os-py-2h os-px-5 os-text-md os-fw-500 os-c-primary${activeClass.class_id === c.class_id ? " is-active" : ""}`}
          >
            {c.grade_name} - {c.class_name}
          </button>
        ))}
      </div>

      <div className="os-grid os-grid-cols-2-1 os-gap-6 os-items-grid-start">
        <div>
          <div className="os-section">
            <div className="os-section__header">
              <h2 className="os-section__title">Student roster - {activeClass.class_name}</h2>
              <span className="os-text-xs os-c-tertiary">{roster?.length ?? 0} students</span>
            </div>
            <div className="os-toolbar">
              <div className="os-search os-max-w-22">
                <Search size={16} className="os-search__icon" />
                <input
                  className="os-search__input"
                  placeholder="Search students…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </div>
              <Button as={Link} to="/t/attendance" renderIcon={EventSchedule} kind="primary" size="md" className="os-ml-auto">
                Mark attendance
              </Button>
            </div>
            {rosterLoading ? (
              <LoadingSpinner />
            ) : (
              filtered.length === 0 ? (
                <EmptyState title="No students found" description="Try a different name or index number." />
              ) : (
                <DataGrid
                  rows={filtered}
                  getRowId={(s) => s.id}
                  pageSize={20}
                  noHover
                  columns={[
                    { key: "n", header: "#", render: (s) => <span className="os-table__muted">{filtered.indexOf(s) + 1}</span> },
                    { key: "name", header: "Name", render: (s) => s.full_name },
                    { key: "index", header: "Index number", render: (s) => <span className="os-table__mono">{s.index_number}</span> },
                    { key: "gender", header: "Gender", render: (s) => <span className="os-table__muted">{capitalize(s.gender)}</span> },
                  ]}
                />
              )
            )}
          </div>
        </div>

        <div>
          <div className="os-section">
            <div className="os-section__header"><h2 className="os-section__title">Class details</h2></div>
            <div className="os-section__body os-py-3 os-px-6">
              <InfoRow label="Grade" value={activeClass.grade_name} />
              <InfoRow label="Class" value={activeClass.class_name} />
              <InfoRow label="Your role" value={activeClass.isFormTeacher ? "Form teacher" : "Subject teacher"} />
              <InfoRow label="Subjects you teach" value={activeClass.subjects.length > 0 ? activeClass.subjects.join(", ") : "-"} />
              <InfoRow label="Students" value={roster?.length ?? 0} divider={false} />
            </div>
          </div>

          <div className="os-section">
            <div className="os-section__header"><h2 className="os-section__title">Houses</h2></div>
            <div className="os-section__body os-py-3 os-px-6">
              {houseCounts.size === 0 ? (
                <p className="os-c-tertiary os-text-sm">No students yet.</p>
              ) : (
                [...houseCounts.entries()].map(([house, count], i, arr) => (
                  <InfoRow key={house} label={house} value={count} bold accent divider={i < arr.length - 1} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
