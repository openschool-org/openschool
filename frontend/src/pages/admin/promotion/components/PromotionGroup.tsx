import { useState } from "react";
import { Button, Checkbox, Tag } from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";
import EntityCombobox from "../../../../components/common/EntityCombobox";
import type { PromotionPreviewRow } from "../../../../services/promotion";

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

export default function PromotionGroup({
  gradeId,
  isGraduating,
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
  isGraduating: boolean;
  gradeName: string;
  rows: PromotionPreviewRow[];
  targetClasses: { id: string; name: string; medium_id: string | null }[];
  assignments: Record<string, string>;
  onAssign: (studentId: string, classId: string) => void;
  onBulkAssign: (map: Record<string, string>) => void;
  selected: Set<string>;
  onToggleSelected: (studentId: string) => void;
  rankByMarks: boolean;
}) {
  const [bulkClassId, setBulkClassId] = useState("");
  const selectedInGroup = rows.filter((r) => selected.has(r.student_id));
  const hasMarks = rankByMarks && rows.some((r) => r.total_marks != null);

  // Same one-map-then-onBulkAssign-once shape as distributeByMarks/
  // distributeRandomly below, rather than calling onAssign once per student.
  const applyBulk = () => {
    if (!bulkClassId) return;
    const map: Record<string, string> = {};
    for (const r of selectedInGroup) map[r.student_id] = bulkClassId;
    onBulkAssign(map);
  };

  // Students in a medium-designated class carry straight over to the same
  // medium in the next grade, so they sit out both distributions — and the
  // medium-designated classes sit out as targets, otherwise a shuffle would
  // refill an English section with students who don't belong in it. Their
  // rows stay visible and their pick stays overridable either way.
  const shufflePool = rows.filter((r) => !r.medium_locked);
  const shuffleTargets = targetClasses.filter((c) => !c.medium_id);
  const lockedCount = rows.length - shufflePool.length;
  const canShuffle = shuffleTargets.length > 0 && shufflePool.length > 0;

  // Highest marks to lowest, dealt round-robin across the grade's target
  // classes — so every class ends up with a similar spread of high-to-low
  // performers (and a similar average) instead of one class getting all
  // the top scorers.
  const distributeByMarks = () => {
    if (!canShuffle) return;
    const sorted = [...shufflePool].sort((a, b) => (b.total_marks ?? -1) - (a.total_marks ?? -1));
    onBulkAssign(roundRobinAssign(sorted, shuffleTargets));
  };

  // Same equal-class-size round-robin dealing, but in random order —
  // unrelated to marks.
  const distributeRandomly = () => {
    if (!canShuffle) return;
    onBulkAssign(roundRobinAssign(shuffled(shufflePool), shuffleTargets));
  };

  return (
    <div className="os-section">
      <div className="os-section__header">
        <h2 className="os-section__title">{gradeName}</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {!isGraduating && targetClasses.length > 0 && (
            <>
              {lockedCount > 0 && (
                <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>
                  {lockedCount} medium-locked, excluded from distribution
                </span>
              )}
              <Button
                kind="ghost"
                size="sm"
                onClick={distributeByMarks}
                disabled={!hasMarks || !canShuffle}
                title={hasMarks ? undefined : "Pick a term and enable “Sort by total marks” above first"}
              >
                Distribute by marks
              </Button>
              <Button kind="ghost" size="sm" onClick={distributeRandomly} disabled={!canShuffle}>
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
                    labelText={`Select ${r.student_name}`}
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
              <td>
                {r.current_class_name}
                {r.medium_locked && (
                  <Tag
                    type="purple"
                    size="sm"
                    style={{ marginLeft: "0.5rem" }}
                    title="Medium-designated class — carries over to the same medium and is left out of distribution"
                  >
                    {r.current_medium_name ?? "Medium"}
                  </Tag>
                )}
              </td>
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
                      <Tag
                        type="green"
                        size="sm"
                        title={
                          r.medium_locked
                            ? "Same-medium carryover suggestion"
                            : "Same-name carryover suggestion"
                        }
                      >
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
