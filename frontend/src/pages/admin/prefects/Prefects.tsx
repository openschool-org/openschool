import { useState } from "react";
import { Link } from "react-router";
import { Trophy, Add, TrashCan } from "@carbon/icons-react";
import {
  Button,
  Select,
  SelectItem,
  InlineNotification,
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  SkeletonText,
} from "@carbon/react";
import { useCurrentAcademicYear } from "../../../queries/useAcademicYears";
import { useStudents } from "../../../queries/useStudents";
import { usePrefects, useAssignPrefect, useRemovePrefect } from "../../../queries/usePrefects";
import { getErrorMessage } from "../../../lib/errorMessage";
import EmptyState from "../../../components/common/EmptyState";
import ErrorMessage from "../../../components/common/ErrorMessage";
import EntityCombobox from "../../../components/common/EntityCombobox";
import type { Prefect, PrefectRank } from "../../../services/prefect";

const RANKS: { value: PrefectRank; label: string }[] = [
  { value: "head", label: "Head Prefects" },
  { value: "deputy_head", label: "Deputy Head Prefects" },
  { value: "senior", label: "Senior Prefects" },
  { value: "junior", label: "Junior Prefects" },
];

export default function Prefects() {
  const { data: currentYear, isLoading: yearLoading } = useCurrentAcademicYear();
  const { data: students } = useStudents();
  const { data: prefects, isLoading: prefectsLoading, isError, refetch } = usePrefects(currentYear?.id ?? "");
  const assignPrefect = useAssignPrefect();
  const removePrefect = useRemovePrefect();

  const [assignOpen, setAssignOpen] = useState(false);
  const [studentChoice, setStudentChoice] = useState("");
  const [rankChoice, setRankChoice] = useState<PrefectRank>("junior");

  const openAssign = () => {
    assignPrefect.reset();
    setStudentChoice("");
    setRankChoice("junior");
    setAssignOpen(true);
  };

  const handleAssign = () => {
    if (!currentYear || !studentChoice) return;
    assignPrefect.mutate(
      { academic_year_id: currentYear.id, student_id: studentChoice, rank: rankChoice },
      { onSuccess: () => setAssignOpen(false) },
    );
  };

  const handleRemove = (p: Prefect) => {
    if (!currentYear) return;
    removePrefect.mutate({ id: p.id, academicYearId: currentYear.id });
  };

  const byRank = (rank: PrefectRank) => (prefects ?? []).filter((p) => p.rank === rank);
  const assignedStudentIds = new Set((prefects ?? []).map((p) => p.student_id));
  const availableStudents = (students ?? []).filter((s) => !assignedStudentIds.has(s.id));

  const loading = yearLoading || prefectsLoading;

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">School Prefects</h1>
          <p className="os-page__subtitle">
            Junior, Senior, Deputy Head and Head Prefects for {currentYear?.label ?? "the current year"}.
          </p>
        </div>
        <Button renderIcon={Add} kind="primary" size="md" onClick={openAssign} disabled={!currentYear}>
          Appoint Prefect
        </Button>
      </div>

      {!yearLoading && !currentYear && (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="No current academic year"
          subtitle="Set an academic year as current before appointing prefects."
          style={{ marginBottom: "1.5rem", maxWidth: "100%" }}
        />
      )}

      {isError && (
        <div style={{ marginBottom: "1.5rem" }}>
          <ErrorMessage message="Could not load prefects." onRetry={refetch} />
        </div>
      )}

      {removePrefect.isError && (
        <InlineNotification
          kind="error"
          lowContrast
          title="Could not remove appointment"
          subtitle={getErrorMessage(removePrefect.error, "Please try again.")}
          onClose={() => removePrefect.reset()}
          style={{ marginBottom: "1.5rem", maxWidth: "100%" }}
        />
      )}

      {RANKS.map(({ value, label }) => (
        <div className="os-section" key={value}>
          <div className="os-section__header">
            <h2 className="os-section__title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Trophy size={16} style={{ fill: "#406AAF" }} /> {label}
            </h2>
            <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>{byRank(value).length}</span>
          </div>

          {loading ? (
            <div style={{ padding: "1.25rem 1.5rem" }}>
              <SkeletonText width="40%" />
            </div>
          ) : byRank(value).length === 0 ? (
            <EmptyState title={`No ${label.toLowerCase()} yet`} description="Appoint a student to this rank." />
          ) : (
            <div>
              {byRank(value).map((p, i) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    padding: "0.75rem 1.5rem",
                    borderBottom: i < byRank(value).length - 1 ? "1px solid #f4f4f4" : "none",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link to={`/students/${p.student_id}`} className="os-table__link" style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                      {p.student_name}
                    </Link>
                    <p style={{ margin: "0.1rem 0 0", fontSize: "0.75rem", color: "#525252" }}>
                      {[p.grade_name, p.student_index].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <Button
                    hasIconOnly
                    kind="ghost"
                    size="sm"
                    iconDescription="Remove"
                    renderIcon={TrashCan}
                    disabled={removePrefect.isPending}
                    onClick={() => handleRemove(p)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <ComposedModal open={assignOpen} size="sm" onClose={() => setAssignOpen(false)}>
        <ModalHeader title="Appoint prefect" />
        <ModalBody>
          {assignPrefect.isError && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={getErrorMessage(assignPrefect.error, "Failed to appoint prefect")}
              lowContrast
              hideCloseButton
              style={{ marginBottom: "1rem", maxWidth: "100%" }}
            />
          )}
          <div style={{ display: "grid", gap: "1rem" }}>
            <EntityCombobox
              id="prefect-student"
              labelText="Student"
              items={availableStudents}
              selectedId={studentChoice}
              onSelect={setStudentChoice}
              getId={(s) => s.id}
              itemToString={(s) => `${s.full_name} — ${s.index_number}`}
              placeholder="Search students by name or index number…"
            />
            <Select
              id="prefect-rank"
              labelText="Rank"
              value={rankChoice}
              onChange={(e) => setRankChoice(e.target.value as PrefectRank)}
            >
              {RANKS.map((r) => (
                <SelectItem key={r.value} value={r.value} text={r.label.replace(/s$/, "")} />
              ))}
            </Select>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={() => setAssignOpen(false)}>
            Cancel
          </Button>
          <Button kind="primary" onClick={handleAssign} disabled={!studentChoice || assignPrefect.isPending}>
            {assignPrefect.isPending ? "Saving…" : "Appoint"}
          </Button>
        </ModalFooter>
      </ComposedModal>
    </div>
  );
}
