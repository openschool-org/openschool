import { useState } from "react";
import { Tag, Select, SelectItem, SkeletonText } from "@carbon/react";
import { useStudentAttendanceHistory } from "../../../queries/useAttendance";
import { useStudentMarks } from "../../../queries/useTermMarks";
import { usePrefectAppointmentsByStudent } from "../../../queries/useStudentPortfolio";
import { useCurrentAcademicYear } from "../../../queries/useAcademicYears";
import { useTerms } from "../../../queries/useTerms";
import EmptyState from "../../../components/common/EmptyState";

const ATTENDANCE_TAG: Record<string, "green" | "red" | "cyan" | "purple"> = {
  present: "green",
  absent: "red",
  late: "cyan",
  excused: "purple",
};

export default function StudentRecordsRollup({ studentId }: { studentId: string }) {
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: terms } = useTerms(currentYear?.id);
  const [termId, setTermId] = useState("");

  const { data: attendance, isLoading: attendanceLoading } = useStudentAttendanceHistory(studentId);
  const { data: marks, isLoading: marksLoading } = useStudentMarks(studentId, termId);
  const { data: appointments, isLoading: appointmentsLoading } = usePrefectAppointmentsByStudent(studentId);

  return (
    <>
      <div className="os-section" style={{ marginTop: "1rem" }}>
        <div className="os-section__header">
          <h2 className="os-section__title">Attendance History</h2>
        </div>
        <div className="os-section__body">
          {attendanceLoading && <SkeletonText width="60%" />}
          {!attendanceLoading && (attendance?.length ?? 0) === 0 && (
            <EmptyState title="No attendance recorded" description="No attendance records exist for this student yet." />
          )}
          {attendance && attendance.length > 0 && (
            <table className="os-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Class</th>
                  <th>Status</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {attendance.slice(0, 50).map((r) => (
                  <tr key={r.id}>
                    <td>{r.session_date}</td>
                    <td>{r.class_name}</td>
                    <td><Tag size="sm" type={ATTENDANCE_TAG[r.status] ?? "gray"}>{r.status}</Tag></td>
                    <td style={{ color: r.note ? undefined : "#c6c6c6" }}>{r.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">Examination Results</h2>
        </div>
        <div className="os-section__body">
          <Select id="rollup-term" labelText="Term" value={termId} onChange={(e) => setTermId(e.target.value)} style={{ maxWidth: "16rem", marginBottom: "1rem" }}>
            <SelectItem value="" text="Select term…" />
            {terms?.map((t) => (
              <SelectItem key={t.id} value={t.id} text={t.name} />
            ))}
          </Select>
          {!termId && <p style={{ fontSize: "0.8125rem", color: "#8d8d8d" }}>Select a term to see marks.</p>}
          {termId && marksLoading && <SkeletonText width="60%" />}
          {termId && !marksLoading && (marks?.length ?? 0) === 0 && (
            <EmptyState title="No marks for this term" description="No marks have been entered for this term yet." />
          )}
          {termId && marks && marks.length > 0 && (
            <table className="os-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Marks</th>
                </tr>
              </thead>
              <tbody>
                {marks.map((m) => (
                  <tr key={m.id}>
                    <td>{m.subject_name} <span style={{ color: "#8d8d8d", fontSize: "0.75rem" }}>({m.subject_code})</span></td>
                    <td>{m.marks} / {m.max_marks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">Prefect Appointments</h2>
        </div>
        <div className="os-section__body">
          {appointmentsLoading && <SkeletonText width="60%" />}
          {!appointmentsLoading && (appointments?.length ?? 0) === 0 && (
            <EmptyState title="No prefect appointments" description="This student has not held a prefect rank." />
          )}
          {appointments && appointments.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {appointments.map((a) => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <Tag size="sm" type="blue">{a.rank.replace(/_/g, " ")}</Tag>
                  <span style={{ fontSize: "0.8125rem", color: "#525252" }}>{a.academic_year_label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
