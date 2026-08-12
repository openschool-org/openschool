import { useState } from "react";
import { ArrowUp, ArrowDown, Warning } from "@carbon/icons-react";
import { Button } from "@carbon/react";
import type { Grade } from "../../../../services/grade";

function gradeNumber(name: string): number | null {
  const m = name.match(/\d+/);
  return m ? Number(m[0]) : null;
}

function nameWarning(name: string, from: number | null, to: number | null): string | null {
  const n = gradeNumber(name);
  if (n === null) return "No number in this name";
  if (from !== null && n < from) return `Below your grade range (${from}-${to})`;
  if (to !== null && n > to) return `Above your grade range (${from}-${to})`;
  return null;
}

export default function GradeRow({
  grade,
  index,
  isLast,
  from,
  to,
  busy,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
}: {
  grade: Grade;
  index: number;
  isLast: boolean;
  from: number | null;
  to: number | null;
  busy: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const warning = nameWarning(grade.name, from, to);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "0.875rem 1.5rem",
        borderBottom: isLast ? "none" : "1px solid #e0e0e0",
        gap: "1rem",
        backgroundColor: hovered ? "#f4f4f4" : "transparent",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        style={{
          width: "1.75rem",
          height: "1.75rem",
          borderRadius: "4px",
          background: "#edf2fa",
          color: "#406AAF",
          fontSize: "0.8125rem",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {index + 1}
      </span>

      <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "#161616" }}>{grade.name}</span>

      {warning && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", color: "#8a6a00" }}>
          <Warning size={14} style={{ fill: "#b28600" }} />
          {warning}
        </span>
      )}

      <div style={{ flex: 1 }} />

      <Button
        hasIconOnly
        kind="ghost"
        size="sm"
        iconDescription="Move up"
        renderIcon={ArrowUp}
        disabled={index === 0 || busy}
        onClick={onMoveUp}
      />
      <Button
        hasIconOnly
        kind="ghost"
        size="sm"
        iconDescription="Move down"
        renderIcon={ArrowDown}
        disabled={isLast || busy}
        onClick={onMoveDown}
      />
      <Button kind="ghost" size="sm" disabled={busy} onClick={onEdit}>
        Edit
      </Button>
      <Button kind="danger--ghost" size="sm" disabled={busy} onClick={onDelete}>
        Delete
      </Button>
    </div>
  );
}
