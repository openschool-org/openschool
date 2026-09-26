import { useState } from "react";
import { Button, Checkbox, Tag } from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";
import EntityCombobox from "@/shared/ui/EntityCombobox";
import type { PromotionPreviewRow } from "@/features/academics/api/promotion";

// Deals rows across targetClasses round-robin, so class sizes differ by at most 1 instead of being lopsided.
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

  const applyBulk = () => {
    if (!bulkClassId) return;
    const map: Record<string, string> = {};
    for (const r of selectedInGroup) map[r.student_id] = bulkClassId;
    onBulkAssign(map);
  };

  // Medium-locked students carry straight to the same medium next grade, so both they and medium-designated classes sit out shuffling.
  const shufflePool = rows.filter((r) => !r.medium_locked);
  const shuffleTargets = targetClasses.filter((c) => !c.medium_id);
  const lockedCount = rows.length - shufflePool.length;
  const canShuffle = shuffleTargets.length > 0 && shufflePool.length > 0;

  // Highest-to-lowest marks dealt round-robin, so each class gets a similar spread of performers instead of one getting all the top scorers.
  const distributeByMarks = () => {
    if (!canShuffle) return;
    const sorted = [...shufflePool].sort((a, b) => (b.total_marks ?? -1) - (a.total_marks ?? -1));
    onBulkAssign(roundRobinAssign(sorted, shuffleTargets));
  };

  const distributeRandomly = () => {
    if (!canShuffle) return;
    onBulkAssign(roundRobinAssign(shuffled(shufflePool), shuffleTargets));
  };

  return (
    <div className="os-section">
      <div className="os-section__header">
        <h2 className="os-section__title">{gradeName}</h2>
        <div className="os-flex os-items-center os-gap-3">
          {!isGraduating && targetClasses.length > 0 && (
            <>
              {lockedCount > 0 && (
                <span className="os-text-xs os-c-tertiary">
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
          <span className="os-text-xs os-c-tertiary">{rows.length}</span>
        </div>
      </div>

      {!isGraduating && selectedInGroup.length > 0 && (
        <div className="os-flex os-items-center os-gap-3 os-py-3 os-px-6 os-bg-accent-light os-border-b">
          <span className="os-text-sm">{selectedInGroup.length} selected</span>
          <div className="os-min-w-16">
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
            {!isGraduating && <th className="os-w-2h" />}
            <th>Student</th>
            <th>Current class</th>
            {rankByMarks && <th>Marks</th>}
            {!isGraduating && <th>Target class</th>}
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
                <div className="os-fw-500 os-text-md">{r.student_name}</div>
                <div className="os-text-xs os-c-tertiary">{r.student_index}</div>
              </td>
              <td>
                {r.current_class_name}
                {r.medium_locked && (
                  <Tag
                    type="purple"
                    size="sm" className="os-ml-2"
                    title="Medium-designated class - carries over to the same medium and is left out of distribution"
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
                    <span className="os-c-disabled">-</span>
                  )}
                </td>
              )}
              {isGraduating ? null : (
                <td>
                  <div className="os-flex os-items-center os-gap-2">
                    <div className="os-min-w-14">
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
                        <ArrowRight size={10} className="os-mr-h" />
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
