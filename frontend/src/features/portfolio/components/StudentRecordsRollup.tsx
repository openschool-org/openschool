import { useState } from "react";
import { SkeletonText } from "@/shared/ui/Skeleton";
import SelectField from "@/shared/ui/SelectField";
import { useStudentAttendanceHistory } from "@/features/attendance/queries/useAttendance";
import { useStudentMarks } from "@/features/marks/queries/useTermMarks";
import { usePrefectAppointmentsByStudent } from "@/features/portfolio/queries/useStudentPortfolio";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useTerms } from "@/features/school/queries/useTerms";
import AttendanceHistoryTable from "@/features/attendance/components/AttendanceHistoryTable";
import TermMarksTable from "@/features/marks/components/TermMarksTable";
import { PrefectsTable } from "@/features/portfolio/components/PortfolioTables";
import EmptyState from "@/shared/ui/EmptyState";
import SectionCard from "@/shared/ui/SectionCard";

// Admin-side read-only summary of a student's attendance, marks and prefect history.
export default function StudentRecordsRollup({ studentId }: { studentId: string }) {
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: terms } = useTerms(currentYear?.id);
  const [termId, setTermId] = useState("");
  const attendance = useStudentAttendanceHistory(studentId);
  const marks = useStudentMarks(studentId, termId);
  const appointments = usePrefectAppointmentsByStudent(studentId);

  return (
    <>
      <SectionCard title="Attendance history" className="os-mt-4" flush>
        {attendance.isLoading ? (
          <div className="os-p-6"><SkeletonText width="60%" /></div>
        ) : attendance.data?.length ? (
          <AttendanceHistoryTable rows={attendance.data} />
        ) : (
          <EmptyState title="No attendance recorded" description="No attendance records exist for this student yet." />
        )}
      </SectionCard>

      <SectionCard title="Examination results">
        <SelectField
          id="rollup-term"
          label="Term"
          value={termId}
          onChange={(v) => setTermId(v)}
          className="os-max-w-16 os-mb-4"
          options={[{ value: "", label: "Select term…" }, ...(terms ?? []).map((t) => ({ value: t.id, label: t.name }))]}
        />
        {!termId ? (
          <p className="os-text-sm os-c-tertiary">Select a term to see marks.</p>
        ) : marks.isLoading ? (
          <SkeletonText width="60%" />
        ) : marks.data?.length ? (
          <TermMarksTable rows={marks.data} />
        ) : (
          <EmptyState title="No marks for this term" description="No marks have been entered for this term yet." />
        )}
      </SectionCard>

      <SectionCard title="Prefect appointments" flush>
        {appointments.isLoading ? (
          <div className="os-p-6"><SkeletonText width="60%" /></div>
        ) : appointments.data?.length ? (
          <PrefectsTable rows={appointments.data} />
        ) : (
          <EmptyState title="No prefect appointments" description="This student has not held a prefect rank." />
        )}
      </SectionCard>
    </>
  );
}
