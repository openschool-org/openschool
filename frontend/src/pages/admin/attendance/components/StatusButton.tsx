import { CheckmarkFilled, CloseFilled, Time, Certificate } from "@carbon/icons-react";
import { STATUS_STYLES, type Status } from "../constants";

export default function StatusButton({
  value,
  selected,
  onClick,
}: {
  value: NonNullable<Status>;
  selected: boolean;
  onClick: () => void;
}) {
  const cfg = STATUS_STYLES[value];
  return (
    <button
      onClick={onClick}
      style={{
        padding: "0.3rem 0.75rem",
        fontSize: "0.75rem",
        fontWeight: selected ? 600 : 400,
        fontFamily: "inherit",
        cursor: "pointer",
        border: `1px solid ${selected ? cfg.border : "#e0e0e0"}`,
        borderRadius: "2px",
        background: selected ? cfg.bg : "#ffffff",
        color: selected ? cfg.color : "#525252",
        transition: "all 0.1s",
        whiteSpace: "nowrap",
      }}
    >
      {value === "present" && (
        <CheckmarkFilled size={12} style={{ marginRight: "4px", fill: selected ? cfg.color : "#8d8d8d", verticalAlign: "middle" }} />
      )}
      {value === "absent" && (
        <CloseFilled size={12} style={{ marginRight: "4px", fill: selected ? cfg.color : "#8d8d8d", verticalAlign: "middle" }} />
      )}
      {value === "late" && (
        <Time size={12} style={{ marginRight: "4px", fill: selected ? cfg.color : "#8d8d8d", verticalAlign: "middle" }} />
      )}
      {value === "excused" && (
        <Certificate size={12} style={{ marginRight: "4px", fill: selected ? cfg.color : "#8d8d8d", verticalAlign: "middle" }} />
      )}
      {cfg.label}
    </button>
  );
}
