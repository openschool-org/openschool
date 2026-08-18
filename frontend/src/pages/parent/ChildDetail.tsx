// This file renders the ChildDetail page, allowing parents to track their child's attendance, marks, class timetables, enrolled subjects, narrative progress reports, portfolio history, and linked guardians.

import { useState } from "react";
import { Link, useParams } from "react-router";
import { Tabs, TabList, Tab, TabPanels, TabPanel, Select, SelectItem, Tag } from "@carbon/react";
import { ArrowLeft } from "@carbon/icons-react";
import { useMyChildren, useChildAttendance, useChildMarks } from "../../queries/useParent";
import { useCurrentAcademicYear } from "../../queries/useAcademicYears";
import { useTerms } from "../../queries/useTerms";
import { useChildTimetable } from "../../queries/timetable/useTimetables";
import { useStudentEnrollments } from "../../queries/useEnrollments";
import {
  useProgressReports,
  usePrefectAppointmentsByStudent,
  useStudentActivities,
  useLeadershipRoles,
  useStudentAwards,
  useDisciplinaryRecords,
} from "../../queries/useStudentPortfolio";
import { useStudentSocietyMemberships } from "../../queries/useSocieties";
import { useGuardiansByStudent } from "../../queries/useGuardians";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";

const WEEKDAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
];

const SEVERITY_TAG: Record<string, "red" | "magenta" | "cool-gray"> = {
  severe: "red",
  major: "magenta",
  minor: "cool-gray",
};

function TimetableTab({ studentId }: { studentId: string }) {
  const { data, isLoading, isError } = useChildTimetable(studentId);

  if (isLoading) return <LoadingSpinner />;
  if (isError || !data) {
    return (
      <EmptyState
        title="No published timetable yet"
        description="This child's class timetable will appear here once it's published."
      />
    );
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {WEEKDAYS.map((day) => {
        const entries = data.entries
          .filter((e) => e.day_of_week === day.value)
          .sort((a, b) => a.period_number - b.period_number);
        if (entries.length === 0) return null;
        return (
          <div key={day.value}>
            <h3 style={{ fontSize: "0.875rem", fontWeight: 600, margin: "0 0 0.5rem" }}>{day.label}</h3>
            <table className="os-table os-table--no-hover">
              <thead>
                <tr>
                  <th style={{ width: "6rem" }}>Period</th>
                  <th>Subject</th>
                  <th>Teacher</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td>P{e.period_number}</td>
                    <td>{e.subject_name ?? "—"}</td>
                    <td>{e.teacher_name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

const STATUS_TAG: Record<string, "green" | "red" | "warm-gray" | "blue"> = {
  present: "green",
  absent: "red",
  late: "warm-gray",
  excused: "blue",
};

function AttendanceTab({ studentId }: { studentId: string }) {
  const { data: records, isLoading } = useChildAttendance(studentId);

  if (isLoading) return <LoadingSpinner />;
  if (!records || records.length === 0) {
    return <EmptyState title="No attendance recorded yet" description="Records will show up here once a class session is marked." />;
  }

  const sorted = [...records].sort((a, b) => b.session_date.localeCompare(a.session_date));

  return (
    <table className="os-table os-table--no-hover">
      <thead>
        <tr>
          <th>Date</th>
          <th>Class</th>
          <th>Status</th>
          <th>Note</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((r) => (
          <tr key={r.id}>
            <td className="os-table__mono">{r.session_date}</td>
            <td>{r.class_name}</td>
            <td>
              <Tag type={STATUS_TAG[r.status] ?? "gray"} size="sm">
                {r.status[0].toUpperCase() + r.status.slice(1)}
              </Tag>
            </td>
            <td className="os-table__muted">{r.note || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MarksTab({ studentId }: { studentId: string }) {
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: terms } = useTerms(currentYear?.id);
  const [termId, setTermId] = useState("");
  const { data: marks, isLoading } = useChildMarks(studentId, termId);

  return (
    <div>
      <Select
        id="child-marks-term"
        labelText="Term"
        value={termId}
        onChange={(e) => setTermId(e.target.value)}
        style={{ maxWidth: "20rem", marginBottom: "1.25rem" }}
      >
        <SelectItem value="" text="Choose a term…" />
        {terms?.map((t) => (
          <SelectItem key={t.id} value={t.id} text={t.name} />
        ))}
      </Select>

      {!termId ? (
        <EmptyState title="Pick a term" description="Choose a term to see marks recorded for it." />
      ) : isLoading ? (
        <LoadingSpinner />
      ) : marks && marks.length > 0 ? (
        <table className="os-table os-table--no-hover">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Teacher</th>
              <th style={{ textAlign: "right" }}>Marks</th>
            </tr>
          </thead>
          <tbody>
            {marks.map((m) => (
              <tr key={m.id}>
                <td>
                  {m.subject_name}{" "}
                  <span className="os-table__muted">({m.subject_code})</span>
                </td>
                <td className="os-table__muted">{m.teacher_name || "—"}</td>
                <td style={{ textAlign: "right", fontWeight: 600 }}>
                  {m.marks} / {m.max_marks}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <EmptyState title="No marks yet" description="Marks for this term haven't been recorded yet." />
      )}
    </div>
  );
}

function EnrollmentsTab({ studentId }: { studentId: string }) {
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: enrollments, isLoading } = useStudentEnrollments(studentId, currentYear?.id ?? "");

  if (isLoading) return <LoadingSpinner />;
  if (!enrollments || enrollments.length === 0) {
    return <EmptyState title="No enrolled subjects" description="This child is not enrolled in any subjects for the current year." />;
  }

  return (
    <table className="os-table os-table--no-hover">
      <thead>
        <tr>
          <th>Subject Name</th>
          <th>Subject Code</th>
          <th>Type</th>
        </tr>
      </thead>
      <tbody>
        {enrollments.map((e) => (
          <tr key={e.subject_id}>
            <td style={{ fontWeight: 500 }}>{e.subject_name}</td>
            <td className="os-table__mono">{e.subject_code}</td>
            <td>{e.subject_type ? e.subject_type[0].toUpperCase() + e.subject_type.slice(1) : "Core"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ProgressReportsTab({ studentId }: { studentId: string }) {
  const { data: reports, isLoading } = useProgressReports(studentId);

  if (isLoading) return <LoadingSpinner />;
  if (!reports || reports.length === 0) {
    return <EmptyState title="No progress reports yet" description="Narrative progress reports will show up here once posted by teachers." />;
  }

  return (
    <table className="os-table os-table--no-hover">
      <thead>
        <tr>
          <th>Term</th>
          <th>Narrative Remarks</th>
          <th>Created At</th>
        </tr>
      </thead>
      <tbody>
        {reports.map((r) => (
          <tr key={r.id}>
            <td style={{ fontWeight: 500 }}>{r.term_name || "—"}</td>
            <td style={{ whiteSpace: "pre-wrap" }}>{r.narrative}</td>
            <td className="os-table__mono" style={{ fontSize: "0.75rem" }}>
              {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PortfolioTab({ studentId }: { studentId: string }) {
  const { data: prefects, isLoading: prefectsLoading } = usePrefectAppointmentsByStudent(studentId);
  const { data: societies, isLoading: societiesLoading } = useStudentSocietyMemberships(studentId);
  const { data: activities, isLoading: activitiesLoading } = useStudentActivities(studentId);
  const { data: leadership, isLoading: leadershipLoading } = useLeadershipRoles(studentId);
  const { data: awards, isLoading: awardsLoading } = useStudentAwards(studentId);
  const { data: discipline, isLoading: disciplineLoading } = useDisciplinaryRecords(studentId);

  const isLoading = prefectsLoading || societiesLoading || activitiesLoading || leadershipLoading || awardsLoading || disciplineLoading;
  if (isLoading) return <LoadingSpinner />;

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div>
        <h3 style={{ fontSize: "0.875rem", fontWeight: 600, margin: "0 0 0.5rem" }}>Prefect Appointments</h3>
        {!prefects || prefects.length === 0 ? (
          <p style={{ fontSize: "0.8125rem", color: "#8d8d8d" }}>No prefect appointments recorded.</p>
        ) : (
          <table className="os-table os-table--no-hover">
            <thead>
              <tr><th>Year</th><th>Appointment / Rank</th></tr>
            </thead>
            <tbody>
              {prefects.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500 }}>{p.academic_year_label}</td>
                  <td>{p.rank}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div>
        <h3 style={{ fontSize: "0.875rem", fontWeight: 600, margin: "1rem 0 0.5rem" }}>Societies & Clubs</h3>
        {!societies || societies.length === 0 ? (
          <p style={{ fontSize: "0.8125rem", color: "#8d8d8d" }}>No society memberships recorded.</p>
        ) : (
          <table className="os-table os-table--no-hover">
            <thead>
              <tr><th>Society</th><th>Role</th><th>Joined Date</th></tr>
            </thead>
            <tbody>
              {societies.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 500 }}>{s.society_name}</td>
                  <td>{s.role ? s.role[0].toUpperCase() + s.role.slice(1) : "Member"}</td>
                  <td className="os-table__mono">{s.created_at ? new Date(s.created_at).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div>
        <h3 style={{ fontSize: "0.875rem", fontWeight: 600, margin: "1rem 0 0.5rem" }}>Co-curricular Activities</h3>
        {!activities || activities.length === 0 ? (
          <p style={{ fontSize: "0.8125rem", color: "#8d8d8d" }}>No activities logged.</p>
        ) : (
          <table className="os-table os-table--no-hover">
            <thead>
              <tr><th>Activity</th><th>Category</th><th>Role</th><th>Achievement</th></tr>
            </thead>
            <tbody>
              {activities.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 500 }}>{a.name}</td>
                  <td>{a.category ? a.category[0].toUpperCase() + a.category.slice(1) : "—"}</td>
                  <td>{a.role || "Participant"}</td>
                  <td>{a.achievement || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div>
        <h3 style={{ fontSize: "0.875rem", fontWeight: 600, margin: "1rem 0 0.5rem" }}>Leadership & Awards</h3>
        {(!leadership || leadership.length === 0) && (!awards || awards.length === 0) ? (
          <p style={{ fontSize: "0.8125rem", color: "#8d8d8d" }}>No leadership roles or awards recorded.</p>
        ) : (
          <>
            {leadership && leadership.length > 0 && (
              <table className="os-table os-table--no-hover" style={{ marginBottom: "1rem" }}>
                <thead>
                  <tr><th>Leadership Role</th><th>Scope</th><th>Assigned</th></tr>
                </thead>
                <tbody>
                  {leadership.map((l) => (
                    <tr key={l.id}>
                      <td style={{ fontWeight: 500 }}>{l.title}</td>
                      <td>{l.scope || "School"}</td>
                      <td className="os-table__mono">{l.created_at ? new Date(l.created_at).toLocaleDateString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {awards && awards.length > 0 && (
              <table className="os-table os-table--no-hover">
                <thead>
                  <tr><th>Award Recognition</th><th>Category</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {awards.map((aw) => (
                    <tr key={aw.id}>
                      <td style={{ fontWeight: 500 }}>{aw.title}</td>
                      <td>{aw.category || "—"}</td>
                      <td className="os-table__mono">{aw.awarded_date ? new Date(aw.awarded_date).toLocaleDateString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      <div>
        <h3 style={{ fontSize: "0.875rem", fontWeight: 600, margin: "1rem 0 0.5rem" }}>Disciplinary Records</h3>
        {!discipline || discipline.length === 0 ? (
          <p style={{ fontSize: "0.8125rem", color: "#8d8d8d" }}>Disciplinary status is clear.</p>
        ) : (
          <table className="os-table os-table--no-hover">
            <thead>
              <tr><th>Date</th><th>Incident</th><th>Severity</th><th>Action Taken</th></tr>
            </thead>
            <tbody>
              {discipline.map((d) => (
                <tr key={d.id}>
                  <td className="os-table__mono">{d.incident_date ? new Date(d.incident_date).toLocaleDateString() : "—"}</td>
                  <td style={{ fontWeight: 500 }}>{d.description}</td>
                  <td>
                    <Tag type={SEVERITY_TAG[d.severity] ?? "cool-gray"} size="sm">
                      {d.severity ? d.severity[0].toUpperCase() + d.severity.slice(1) : "Minor"}
                    </Tag>
                  </td>
                  <td>{d.action_taken || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function GuardiansTab({ studentId }: { studentId: string }) {
  const { data: guardians, isLoading } = useGuardiansByStudent(studentId);

  if (isLoading) return <LoadingSpinner />;
  if (!guardians || guardians.length === 0) {
    return <EmptyState title="No guardians linked" description="No linked guardians found for this child." />;
  }

  return (
    <table className="os-table os-table--no-hover">
      <thead>
        <tr>
          <th>Name</th>
          <th>Relationship</th>
          <th>Phone</th>
          <th>Primary Contact</th>
        </tr>
      </thead>
      <tbody>
        {guardians.map((g) => (
          <tr key={g.id}>
            <td style={{ fontWeight: 500 }}>{g.full_name}</td>
            <td>{g.relationship ? g.relationship[0].toUpperCase() + g.relationship.slice(1) : "Guardian"}</td>
            <td className="os-table__mono">{g.phone || "—"}</td>
            <td>
              {g.is_primary_contact ? (
                <span style={{ color: "#24a148", fontWeight: 600 }}>Yes</span>
              ) : (
                "No"
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function ChildDetail() {
  const { id = "" } = useParams();
  const { data: children, isLoading } = useMyChildren();
  const child = children?.find((c) => c.id === id);

  if (isLoading) return <LoadingSpinner />;
  if (!child) {
    return (
      <div style={{ padding: "2rem" }}>
        <EmptyState
          title="Child not found"
          description="This student isn't linked to your account."
          action={
            <Link to="/" className="os-table__link">
              Back to My Children
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ background: "#f4f4f4", minHeight: "calc(100vh - 3rem)" }}>
      <div className="os-profile__banner">
        <div className="os-profile__avatar">
          {child.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <p className="os-profile__name">{child.full_name}</p>
          <p className="os-profile__meta">
            {child.index_number}
            {child.class_name ? ` · ${child.class_name}` : ""}
            {child.grade_name ? ` · ${child.grade_name}` : ""}
          </p>
        </div>
        <div className="os-profile__actions">
          <Link to="/" className="os-table__link" style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <ArrowLeft size={16} />
            Back
          </Link>
        </div>
      </div>

      <div style={{ padding: "1.5rem 2rem" }}>
        <Tabs>
          <TabList aria-label="Child sections">
            <Tab>Attendance</Tab>
            <Tab>Marks</Tab>
            <Tab>Timetable</Tab>
            <Tab>Enrollments</Tab>
            <Tab>Progress Reports</Tab>
            <Tab>Portfolio Details</Tab>
            <Tab>Guardians</Tab>
          </TabList>
          <TabPanels>
            <TabPanel style={{ padding: 0 }}>
              <div className="os-section" style={{ marginTop: "1rem" }}>
                <div className="os-section__header">
                  <h2 className="os-section__title">Attendance</h2>
                </div>
                <AttendanceTab studentId={child.id} />
              </div>
            </TabPanel>
            <TabPanel style={{ padding: 0 }}>
              <div className="os-section" style={{ marginTop: "1rem" }}>
                <div className="os-section__header">
                  <h2 className="os-section__title">Term Marks</h2>
                </div>
                <div className="os-section__body">
                  <MarksTab studentId={child.id} />
                </div>
              </div>
            </TabPanel>
            <TabPanel style={{ padding: 0 }}>
              <div className="os-section" style={{ marginTop: "1rem" }}>
                <div className="os-section__header">
                  <h2 className="os-section__title">Timetable</h2>
                </div>
                <div className="os-section__body">
                  <TimetableTab studentId={child.id} />
                </div>
              </div>
            </TabPanel>
            <TabPanel style={{ padding: 0 }}>
              <div className="os-section" style={{ marginTop: "1rem" }}>
                <div className="os-section__header">
                  <h2 className="os-section__title">Enrolled Subjects</h2>
                </div>
                <div className="os-section__body">
                  <EnrollmentsTab studentId={child.id} />
                </div>
              </div>
            </TabPanel>
            <TabPanel style={{ padding: 0 }}>
              <div className="os-section" style={{ marginTop: "1rem" }}>
                <div className="os-section__header">
                  <h2 className="os-section__title">Narrative Progress Reports</h2>
                </div>
                <div className="os-section__body">
                  <ProgressReportsTab studentId={child.id} />
                </div>
              </div>
            </TabPanel>
            <TabPanel style={{ padding: 0 }}>
              <div className="os-section" style={{ marginTop: "1rem" }}>
                <div className="os-section__header">
                  <h2 className="os-section__title">Co-curricular & Portfolio Details</h2>
                </div>
                <div className="os-section__body">
                  <PortfolioTab studentId={child.id} />
                </div>
              </div>
            </TabPanel>
            <TabPanel style={{ padding: 0 }}>
              <div className="os-section" style={{ marginTop: "1rem" }}>
                <div className="os-section__header">
                  <h2 className="os-section__title">Linked Guardians</h2>
                </div>
                <div className="os-section__body">
                  <GuardiansTab studentId={child.id} />
                </div>
              </div>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </div>
  );
}
