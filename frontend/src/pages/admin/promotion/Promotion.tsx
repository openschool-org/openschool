import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Button, Select, SelectItem, Checkbox, InlineNotification, SkeletonText } from "@carbon/react";
import { Renew } from "@carbon/icons-react";
import { useAcademicYears } from "../../../queries/useAcademicYears";
import { useTerms } from "../../../queries/useTerms";
import { useClassesByAcademicYear } from "../../../queries/useClasses";
import { usePromotionPreview, useCommitAssignments } from "../../../queries/usePromotion";
import { getErrorMessage } from "../../../lib/errorMessage";
import EmptyState from "../../../components/common/EmptyState";
import ErrorMessage from "../../../components/common/ErrorMessage";
import type { PromotionPreviewRow } from "../../../services/promotion";
import PromotionGroup from "./components/PromotionGroup";

export default function Promotion() {
  const { data: years, isLoading: yearsLoading } = useAcademicYears();

  const currentYear = years?.find((y) => y.is_current);
  const otherYears = (years ?? []).filter((y) => !y.is_current);

  const [sourceYearId, setSourceYearId] = useState("");
  const [targetYearId, setTargetYearId] = useState("");
  const [termId, setTermId] = useState("");
  const [rankByMarks, setRankByMarks] = useState(false);

  const effectiveSourceYearId = sourceYearId || currentYear?.id || "";

  const { data: terms } = useTerms(effectiveSourceYearId);
  const { data: targetClasses } = useClassesByAcademicYear(targetYearId);
  const {
    data: preview,
    isLoading: previewLoading,
    isError: previewError,
    refetch,
  } = usePromotionPreview(effectiveSourceYearId, targetYearId, rankByMarks ? termId : undefined);

  const commit = useCommitAssignments();

  // student_id -> chosen target class_id; seeded from the preview's
  // suggested_class_id whenever the preview data changes, but always
  // overridable per student (never re-seeded once the admin has touched it).
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [seededFor, setSeededFor] = useState<string | null>(null);
  const previewKey = `${effectiveSourceYearId}|${targetYearId}`;
  if (preview && seededFor !== previewKey) {
    const seeded: Record<string, string> = {};
    for (const row of preview) {
      if (row.suggested_class_id) seeded[row.student_id] = row.suggested_class_id;
    }
    setAssignments(seeded);
    setSeededFor(previewKey);
  }

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggleSelected = (studentId: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });

  const groups = useMemo(() => {
    const byGrade = new Map<string, { gradeName: string; rows: PromotionPreviewRow[] }>();
    for (const row of preview ?? []) {
      // Use the same `graduating` signal `unassignedCount` below reads,
      // rather than inferring it from `next_grade_id` being null — two
      // different signals for one concept is fragile if the backend's
      // next_grade_id === null ⟺ graduating === true invariant ever loosens.
      const key = row.graduating ? "graduating" : row.next_grade_id!;
      const label = row.graduating ? "Graduating (no next grade)" : row.next_grade_name!;
      if (!byGrade.has(key)) byGrade.set(key, { gradeName: label, rows: [] });
      byGrade.get(key)!.rows.push(row);
    }
    const list = [...byGrade.entries()].map(([gradeId, v]) => ({ gradeId, ...v }));
    if (rankByMarks) {
      for (const g of list) {
        g.rows.sort((a, b) => (b.total_marks ?? -1) - (a.total_marks ?? -1));
      }
    }
    return list;
  }, [preview, rankByMarks]);

  const readyToCommit = Object.keys(assignments).length > 0;

  const handleCommit = () => {
    if (!targetYearId) return;
    const entries = Object.entries(assignments)
      .filter(([, classId]) => !!classId)
      .map(([studentId, classId]) => ({ student_id: studentId, class_id: classId }));
    if (entries.length === 0) return;
    commit.mutate(
      { academic_year_id: targetYearId, assignments: entries },
      { onSuccess: () => setSelected(new Set()) },
    );
  };

  const unassignedCount = (preview ?? []).filter((r) => !r.graduating && !assignments[r.student_id]).length;

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Academic Year Promotion</h1>
          <p className="os-page__subtitle">
            Promote students to their next grade and assign them to classes in a new academic year — nothing is
            visible to the rest of the app until that year is set as current.
          </p>
        </div>
      </div>

      {!yearsLoading && otherYears.length === 0 && (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="No other academic year to promote into"
          subtitle="Create the new academic year (and its classes) first, then come back here."
          style={{ marginBottom: "0.5rem", maxWidth: "100%" }}
        />
      )}
      {!yearsLoading && otherYears.length === 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <Link to="/academic-years" style={{ fontSize: "0.8125rem" }}>
            Go to Academic Years →
          </Link>
        </div>
      )}

      <div className="os-section" style={{ marginBottom: "1.5rem" }}>
        <div className="os-section__body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "1rem", alignItems: "end", padding: "1.25rem 1.5rem" }}>
          <Select
            id="source-year"
            labelText="Source year"
            value={effectiveSourceYearId}
            onChange={(e) => setSourceYearId(e.target.value)}
          >
            <SelectItem value="" text={currentYear ? `${currentYear.label} (current)` : "Select…"} />
            {(years ?? []).map((y) => (
              <SelectItem key={y.id} value={y.id} text={y.label + (y.is_current ? " (current)" : "")} />
            ))}
          </Select>
          <Select
            id="target-year"
            labelText="Target year"
            value={targetYearId}
            onChange={(e) => setTargetYearId(e.target.value)}
          >
            <SelectItem value="" text="Select…" />
            {otherYears.map((y) => (
              <SelectItem key={y.id} value={y.id} text={y.label} />
            ))}
          </Select>
          <Select id="rank-term" labelText="Sort by marks (optional)" value={termId} onChange={(e) => setTermId(e.target.value)}>
            <SelectItem value="" text="None" />
            {(terms ?? []).map((t) => (
              <SelectItem key={t.id} value={t.id} text={t.name} />
            ))}
          </Select>
          <Checkbox
            id="rank-by-marks"
            labelText="Sort by total marks"
            checked={rankByMarks}
            disabled={!termId}
            onChange={(_e, { checked }) => setRankByMarks(checked)}
          />
        </div>
      </div>

      {previewError && (
        <div style={{ marginBottom: "1.5rem" }}>
          <ErrorMessage message="Could not load the promotion preview." onRetry={refetch} />
        </div>
      )}
      {commit.isError && (
        <InlineNotification
          kind="error"
          lowContrast
          title="Could not save assignments"
          subtitle={getErrorMessage(commit.error, "Please try again.")}
          onClose={() => commit.reset()}
          style={{ marginBottom: "1.5rem", maxWidth: "100%" }}
        />
      )}
      {commit.isSuccess && (
        <InlineNotification
          kind="success"
          lowContrast
          title="Assignments saved"
          subtitle={`${commit.data?.assigned ?? 0} student${commit.data?.assigned === 1 ? "" : "s"} assigned in the target year. Set it as current from Academic Years when you're ready to publish.`}
          onClose={() => commit.reset()}
          style={{ marginBottom: "1.5rem", maxWidth: "100%" }}
        />
      )}

      {!targetYearId ? (
        <div className="os-section">
          <EmptyState title="Pick a target year" description="Choose the academic year you're promoting students into." />
        </div>
      ) : previewLoading ? (
        <div className="os-section" style={{ padding: "1.5rem" }}>
          <SkeletonText width="40%" />
        </div>
      ) : groups.length === 0 ? (
        <div className="os-section">
          <EmptyState title="No active students" description="No actively-enrolled students found for the source year." />
        </div>
      ) : (
        groups.map((group) => (
          <PromotionGroup
            key={group.gradeId}
            gradeId={group.gradeId}
            gradeName={group.gradeName}
            rows={group.rows}
            targetClasses={(targetClasses ?? []).filter((c) => c.grade_id === group.gradeId)}
            assignments={assignments}
            onAssign={(studentId, classId) => setAssignments((a) => ({ ...a, [studentId]: classId }))}
            onBulkAssign={(map) => setAssignments((a) => ({ ...a, ...map }))}
            selected={selected}
            onToggleSelected={toggleSelected}
            rankByMarks={rankByMarks}
          />
        ))
      )}

      {groups.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1.5rem 0" }}>
          {unassignedCount > 0 && (
            <span style={{ fontSize: "0.8125rem", color: "#7d5a00" }}>
              {unassignedCount} student{unassignedCount !== 1 ? "s" : ""} without a target class — they'll be
              skipped until assigned.
            </span>
          )}
          <div style={{ flex: 1 }} />
          <Button
            renderIcon={Renew}
            kind="primary"
            onClick={handleCommit}
            disabled={!readyToCommit || commit.isPending}
          >
            {commit.isPending ? "Saving…" : "Save Assignments"}
          </Button>
        </div>
      )}
    </div>
  );
}

