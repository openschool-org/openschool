import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  Button,
  Select,
  SelectItem,
  Checkbox,
  Tag,
  InlineNotification,
  SkeletonText,
} from "@carbon/react";
import { Renew, ArrowRight } from "@carbon/icons-react";
import { useAcademicYears } from "../../../queries/useAcademicYears";
import { useTerms } from "../../../queries/useTerms";
import { useClassesByAcademicYear } from "../../../queries/useClasses";
import { usePromotionPreview, useCommitAssignments } from "../../../queries/usePromotion";
import { getErrorMessage } from "../../../lib/errorMessage";
import EmptyState from "../../../components/common/EmptyState";
import ErrorMessage from "../../../components/common/ErrorMessage";
import EntityCombobox from "../../../components/common/EntityCombobox";
import type { PromotionPreviewRow } from "../../../services/promotion";

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
      const key = row.next_grade_id ?? "graduating";
      const label = row.next_grade_name ?? "Graduating (no next grade)";
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

// Deals a list of rows out across targetClasses in round-robin order
// (row i -> targetClasses[i % targetClasses.length]) — class sizes end up
// equal or differing by at most 1 (e.g. 30/30/29), never lopsided, since
// every class gets exactly one more student per pass through the list
// before any class gets a second.
function roundRobinAssign(orderedRows: PromotionPreviewRow[], targetClasses: { id: string }[]): Record<string, string> {
  const map: Record<string, string> = {};
  orderedRows.forEach((r, i) => {
    const cls = targetClasses[i % targetClasses.length];
    if (cls) map[r.student_id] = cls.id;
  });
  return map;
}

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function PromotionGroup({
  gradeId,
  gradeName,
  rows,
  targetClasses,
  assignments,
  onAssign,
  onBulkAssign,
  selected,
  onToggleSelected,
  rankByMarks,
}: {
  gradeId: string;
  gradeName: string;
  rows: PromotionPreviewRow[];
  targetClasses: { id: string; name: string }[];
  assignments: Record<string, string>;
  onAssign: (studentId: string, classId: string) => void;
  onBulkAssign: (map: Record<string, string>) => void;
  selected: Set<string>;
  onToggleSelected: (studentId: string) => void;
  rankByMarks: boolean;
}) {
  const [bulkClassId, setBulkClassId] = useState("");
  const isGraduating = gradeId === "graduating";
  const selectedInGroup = rows.filter((r) => selected.has(r.student_id));
  const hasMarks = rankByMarks && rows.some((r) => r.total_marks != null);

  const applyBulk = () => {
    if (!bulkClassId) return;
    for (const r of selectedInGroup) onAssign(r.student_id, bulkClassId);
  };

  // Highest marks to lowest, dealt round-robin across the grade's target
  // classes — so every class ends up with a similar spread of high-to-low
  // performers (and a similar average) instead of one class getting all
  // the top scorers.
  const distributeByMarks = () => {
    if (targetClasses.length === 0) return;
    const sorted = [...rows].sort((a, b) => (b.total_marks ?? -1) - (a.total_marks ?? -1));
    onBulkAssign(roundRobinAssign(sorted, targetClasses));
  };

  // Same equal-class-size round-robin dealing, but in random order —
  // unrelated to marks.
  const distributeRandomly = () => {
    if (targetClasses.length === 0) return;
    onBulkAssign(roundRobinAssign(shuffled(rows), targetClasses));
  };

  return (
    <div className="os-section">
      <div className="os-section__header">
        <h2 className="os-section__title">{gradeName}</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {!isGraduating && targetClasses.length > 0 && (
            <>
              <Button
                kind="ghost"
                size="sm"
                onClick={distributeByMarks}
                disabled={!hasMarks}
                title={hasMarks ? undefined : "Pick a term and enable “Sort by total marks” above first"}
              >
                Distribute by marks
              </Button>
              <Button kind="ghost" size="sm" onClick={distributeRandomly}>
                Assign randomly
              </Button>
            </>
          )}
          <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>{rows.length}</span>
        </div>
      </div>

      {!isGraduating && selectedInGroup.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1.5rem", background: "#edf5ff", borderBottom: "1px solid #e0e0e0" }}>
          <span style={{ fontSize: "0.8125rem" }}>{selectedInGroup.length} selected</span>
          <div style={{ minWidth: "16rem" }}>
            <EntityCombobox
              id={`bulk-class-${gradeId}`}
              items={targetClasses}
              selectedId={bulkClassId}
              onSelect={setBulkClassId}
              getId={(c) => c.id}
              itemToString={(c) => c.name}
              placeholder="Move selected to…"
            />
          </div>
          <Button kind="tertiary" size="sm" onClick={applyBulk} disabled={!bulkClassId}>
            Apply
          </Button>
        </div>
      )}

      <table className="os-table">
        <thead>
          <tr>
            {!isGraduating && <th style={{ width: "2.5rem" }} />}
            <th>Student</th>
            <th>Current Class</th>
            {rankByMarks && <th>Marks</th>}
            {!isGraduating && <th>Target Class</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.student_id}>
              {!isGraduating && (
                <td>
                  <Checkbox
                    id={`select-${r.student_id}`}
                    labelText=""
                    hideLabel
                    checked={selected.has(r.student_id)}
                    onChange={() => onToggleSelected(r.student_id)}
                  />
                </td>
              )}
              <td>
                <div style={{ fontWeight: 500, fontSize: "0.875rem" }}>{r.student_name}</div>
                <div style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>{r.student_index}</div>
              </td>
              <td>{r.current_class_name}</td>
              {rankByMarks && (
                <td>
                  {r.total_marks != null ? (
                    <Tag type="blue" size="sm">
                      {r.total_marks} / {r.total_max_marks}
                    </Tag>
                  ) : (
                    <span style={{ color: "#c6c6c6" }}>—</span>
                  )}
                </td>
              )}
              {isGraduating ? null : (
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ minWidth: "14rem" }}>
                      <EntityCombobox
                        id={`class-${r.student_id}`}
                        items={targetClasses}
                        selectedId={assignments[r.student_id] ?? ""}
                        onSelect={(id) => onAssign(r.student_id, id)}
                        getId={(c) => c.id}
                        itemToString={(c) => c.name}
                        placeholder="Choose class…"
                      />
                    </div>
                    {r.suggested_class_name && assignments[r.student_id] === r.suggested_class_id && (
                      <Tag type="green" size="sm" title="Same-name carryover suggestion">
                        <ArrowRight size={10} style={{ marginRight: "2px" }} />
                        Suggested
                      </Tag>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
