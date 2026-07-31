import { useState } from "react";
import { Link, useParams } from "react-router";
import { Tabs, TabList, Tab, TabPanels, TabPanel, Select, SelectItem, Tag } from "@carbon/react";
import { ArrowLeft } from "@carbon/icons-react";
import { useMyChildren, useChildAttendance, useChildMarks } from "../../queries/useParent";
import { useCurrentAcademicYear } from "../../queries/useAcademicYears";
import { useTerms } from "../../queries/useTerms";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";

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
          </TabPanels>
        </Tabs>
      </div>
    </div>
  );
}
