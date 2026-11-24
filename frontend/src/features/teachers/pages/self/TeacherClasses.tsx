import { useState } from "react";
import { Segmented } from "antd";
import { useQuery } from "@tanstack/react-query";
import { ScheduleOutlined } from "@ant-design/icons";
import LinkButton from "@/shared/ui/LinkButton";
import FilterBar from "@/shared/ui/FilterBar";
import SectionCard from "@/shared/ui/SectionCard";
import StartSessionButton from "@/features/attendance/components/StartSessionButton";
import { classSessionsOptions } from "@/features/attendance/queries/useAttendance";
import { todayISODate } from "@/shared/lib/date";
import { useMyClasses, useTeacherSubjects } from "@/features/teachers/queries/useTeachers";
import { useStudentsByClass } from "@/features/students/queries/useStudents";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import EmptyState from "@/shared/ui/EmptyState";
import InfoRow from "@/shared/ui/InfoRow";
import DataGrid from "@/shared/ui/DataGrid";
import { capitalize } from "@/shared/lib/text";
import { displayName } from "@/shared/lib/name";
import { classLabel } from "@/shared/lib/classLabel";
import PageHeader from "@/shared/ui/PageHeader";

export default function TeacherClasses() {
  const { teacher, classes: allClasses, isLoading, isError, refetch } = useMyClasses();
  // My classes is the class teacher's own class; subject classes live under Class attendance and Marks.
  const myClasses = allClasses.filter((c) => c.isFormTeacher);
  const { data: qualified } = useTeacherSubjects(teacher?.id ?? "");
  const [activeClassId, setActiveClassId] = useState("");
  const [query, setQuery] = useState("");

  const activeClass = myClasses.find((c) => c.class_id === activeClassId) ?? myClasses[0];
  const { data: roster, isLoading: rosterLoading } = useStudentsByClass(activeClass?.class_id ?? "");
  const { data: sessions } = useQuery({ ...classSessionsOptions(activeClass?.class_id ?? ""), enabled: !!activeClass });
  const todaySession = (sessions ?? []).find((s) => s.date === todayISODate());

  if (isLoading) return <LoadingSpinner />;
  if (isError) {
    return (
      <div className="os-page">
        <PageHeader title="My classes" />
        <ErrorMessage message="Failed to load your classes" onRetry={refetch} />
      </div>
    );
  }
  if (myClasses.length === 0 || !activeClass) {
    return (
      <div className="os-page">
        <PageHeader title="My classes" />
        <EmptyState
          title="You are not a class teacher"
          description="My classes is for the class you lead. See your teaching classes under Class attendance and Marks."
        />
      </div>
    );
  }

  const filtered = (roster ?? []).filter(
    (s) =>
      s.full_name.toLowerCase().includes(query.toLowerCase()) ||
      s.name_with_initials.toLowerCase().includes(query.toLowerCase()) ||
      s.index_number.toLowerCase().includes(query.toLowerCase())
  );

  const houseCounts = new Map<string, number>();
  for (const s of roster ?? []) {
    const house = s.house_name ?? "No house";
    houseCounts.set(house, (houseCounts.get(house) ?? 0) + 1);
  }

  return (
    <div className="os-page">
      <PageHeader title="My classes" subtitle={<>{myClasses.length} class{myClasses.length > 1 ? "es" : ""} this year</>} />

      {myClasses.length > 1 && (
        <Segmented
          className="os-mb-6"
          value={activeClass.class_id}
          onChange={(v) => { setActiveClassId(String(v)); setQuery(""); }}
          options={myClasses.map((c) => ({ value: c.class_id, label: classLabel(c.grade_name, c.class_name) }))}
        />
      )}
      <div className="os-grid os-grid-cols-2-1 os-gap-6 os-items-grid-start">
        <div>
          <SectionCard
            title={`Student roster · ${activeClass.class_name}`}
            meta={<span className="os-text-sm os-c-tertiary">{roster?.length ?? 0} students</span>}
            flush
          >
            <div className="os-section__body os-flex os-items-center os-gap-3 os-wrap">
              <div className="os-flex-1">
                <FilterBar search={{ value: query, onChange: setQuery, placeholder: "Search by name or index number" }} />
              </div>
              {todaySession ? (
                <LinkButton to={`/attendance/sessions/${todaySession.id}/mark`} icon={<ScheduleOutlined />}>
                  {activeClass.isFormTeacher ? "Open today's attendance" : "View today's attendance"}
                </LinkButton>
              ) : activeClass.isFormTeacher ? (
                <StartSessionButton classId={activeClass.class_id}>Take attendance</StartSessionButton>
              ) : (
                <span className="os-text-sm os-c-tertiary">The class teacher takes attendance</span>
              )}
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
                    { key: "name", header: "Name", render: (s) => <span title={s.full_name}>{displayName(s)}</span> },
                    { key: "index", header: "Index number", render: (s) => <span className="os-table__mono">{s.index_number}</span> },
                    { key: "gender", header: "Gender", render: (s) => <span className="os-table__muted">{capitalize(s.gender)}</span> },
                  ]}
                />
              )
            )}
          </SectionCard>
        </div>

        <div>
          <div className="os-section">
            <div className="os-section__header"><h2 className="os-section__title">Class details</h2></div>
            <div className="os-section__body os-py-3 os-px-6">
              <InfoRow label="Grade" value={activeClass.grade_name} />
              <InfoRow label="Class" value={activeClass.class_name} />
              <InfoRow label="Your role" value={activeClass.isFormTeacher ? "Class teacher" : "Subject teacher"} />
              {/* Class subjects come from Class > Subjects in admin; qualifications from Teacher subjects. */}
              <InfoRow label="Subjects in this class" value={activeClass.subjects.length > 0 ? activeClass.subjects.join(", ") : "None assigned yet"} />
              <InfoRow label="Your subjects" value={qualified && qualified.length > 0 ? qualified.map((q) => `${q.name} (${q.code})`).join(", ") : "-"} />
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
