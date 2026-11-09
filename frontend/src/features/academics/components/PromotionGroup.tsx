import { useState } from "react";
import { Button, Tag, Tooltip } from "antd";
import { ArrowRightOutlined } from "@ant-design/icons";
import EntityCombobox from "@/shared/ui/EntityCombobox";
import type { PromotionPreviewRow } from "@/features/academics/api/promotion";
import DataGrid, { type GridColumn } from "@/shared/ui/DataGrid";

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

  const columns: GridColumn<PromotionPreviewRow>[] = [
    {
      key: "student",
      header: "Student",
      render: (r) => (
        <>
          <div className="os-fw-500 os-text-md">{r.student_name}</div>
          <div className="os-text-xs os-c-tertiary">{r.student_index}</div>
        </>
      ),
    },
    {
      key: "current",
      header: "Current class",
      render: (r) => (
        <>
          {r.current_class_name}
          {r.medium_locked && (
            <Tag color="purple" variant="filled" className="os-ml-2" title="Medium-designated class - carries over to the same medium and is left out of distribution">
              {r.current_medium_name ?? "Medium"}
            </Tag>
          )}
        </>
      ),
    },
    ...(rankByMarks
      ? [{
          key: "marks",
          header: "Marks",
          render: (r: PromotionPreviewRow) =>
            r.total_marks != null ? <Tag color="blue" variant="filled">{r.total_marks} / {r.total_max_marks}</Tag> : <span className="os-c-disabled">-</span>,
        }]
      : []),
    ...(isGraduating
      ? []
      : [{
          key: "target",
          header: "Target class",
          render: (r: PromotionPreviewRow) => (
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
                <Tag color="success" variant="filled" icon={<ArrowRightOutlined />} title={r.medium_locked ? "Same-medium carryover suggestion" : "Same-name carryover suggestion"}>
                  Suggested
                </Tag>
              )}
            </div>
          ),
        }]),
  ];

  // DataGrid reports the whole new selection; PromotionGroup's parent toggles one student at a time.
  const changeSelection = (next: Set<string>) => {
    for (const r of rows) if (next.has(r.student_id) !== selected.has(r.student_id)) onToggleSelected(r.student_id);
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
              <Tooltip title={hasMarks ? undefined : "Pick a term and enable “Sort by total marks” above first"}>
                <Button type="text" size="small" onClick={distributeByMarks} disabled={!hasMarks || !canShuffle}>
                  Distribute by marks
                </Button>
              </Tooltip>
              <Button type="text" size="small" onClick={distributeRandomly} disabled={!canShuffle}>
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
          <Button size="small" onClick={applyBulk} disabled={!bulkClassId}>
            Apply
          </Button>
        </div>
      )}

      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(r) => r.student_id}
        pagination={false}
        noHover
        selected={isGraduating ? undefined : selected}
        onSelectionChange={isGraduating ? undefined : changeSelection}
      />
    </div>
  );
}
