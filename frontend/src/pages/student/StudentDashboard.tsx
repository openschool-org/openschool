import { useState } from "react";
import { Tabs, TabList, Tab, TabPanels, TabPanel, Select, SelectItem, Tag } from "@carbon/react";
import { useMyStudentProfile, useMyAttendance, useMyMarks } from "../../queries/useStudentSelf";
import { useCurrentAcademicYear } from "../../queries/useAcademicYears";
import { useTerms } from "../../queries/useTerms";
import { useMyClassTimetable } from "../../queries/timetable/useTimetables";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ErrorMessage from "../../components/common/ErrorMessage";
import EmptyState from "../../components/common/EmptyState";

const WEEKDAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
];

function TimetableTab() {
  const { data, isLoading, isError } = useMyClassTimetable();

  if (isLoading) return <LoadingSpinner />;
  if (isError || !data) {
    return (
      <EmptyState
        title="No published timetable yet"
        description="Your class timetable will appear here once it's published by the admin."
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
                  <th>Classroom</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td>P{e.period_number}</td>
                    <td>{e.subject_name ?? "—"}</td>
                    <td>{e.teacher_name ?? "—"}</td>
                    <td>{e.classroom_name ?? "—"}</td>
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

function AttendanceTab() {
  const { data: records, isLoading } = useMyAttendance();

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

function MarksTab() {
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: terms } = useTerms(currentYear?.id);
  const [termId, setTermId] = useState("");
  const { data: marks, isLoading } = useMyMarks(termId);

  return (
    <div>
      <Select
        id="my-marks-term"
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
        <EmptyState title="Pick a term" description="Choose a term to see your marks for it." />
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

export default function StudentDashboard() {
  const { data: profile, isLoading, isError, refetch } = useMyStudentProfile();

  if (isLoading) return <LoadingSpinner />;
  if (isError || !profile) {
    return (
      <div style={{ padding: "2rem" }}>
        <ErrorMessage message="Failed to load your profile" onRetry={refetch} />
      </div>
    );
  }

  return (
    <div style={{ background: "#f4f4f4", minHeight: "calc(100vh - 3rem)" }}>
      <div className="os-profile__banner">
        <div className="os-profile__avatar">
          {profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <p className="os-profile__name">{profile.full_name}</p>
          <p className="os-profile__meta">
            {profile.index_number}
            {profile.class_name ? ` · ${profile.class_name}` : ""}
            {profile.grade_name ? ` · ${profile.grade_name}` : ""}
          </p>
        </div>
        {profile.house_name && (
          <div className="os-profile__actions">
            <Tag type="blue" size="sm">
              {profile.house_name} House
            </Tag>
          </div>
        )}
      </div>

      <div style={{ padding: "1.5rem 2rem" }}>
        <Tabs>
          <TabList aria-label="My sections">
            <Tab>Attendance</Tab>
            <Tab>Marks</Tab>
            <Tab>Timetable</Tab>
          </TabList>
          <TabPanels>
            <TabPanel style={{ padding: 0 }}>
              <div className="os-section" style={{ marginTop: "1rem" }}>
                <div className="os-section__header">
                  <h2 className="os-section__title">Attendance</h2>
                </div>
                <AttendanceTab />
              </div>
            </TabPanel>
            <TabPanel style={{ padding: 0 }}>
              <div className="os-section" style={{ marginTop: "1rem" }}>
                <div className="os-section__header">
                  <h2 className="os-section__title">Term Marks</h2>
                </div>
                <div className="os-section__body">
                  <MarksTab />
                </div>
              </div>
            </TabPanel>
            <TabPanel style={{ padding: 0 }}>
              <div className="os-section" style={{ marginTop: "1rem" }}>
                <div className="os-section__header">
                  <h2 className="os-section__title">Timetable</h2>
                </div>
                <div className="os-section__body">
                  <TimetableTab />
                </div>
              </div>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </div>
  );
}
