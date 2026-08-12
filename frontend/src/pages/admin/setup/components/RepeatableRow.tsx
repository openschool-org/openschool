import { Button } from "@carbon/react";
import { TrashCan } from "@carbon/icons-react";

export default function RepeatableRow({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem", marginBottom: "0.75rem" }}>
      <div style={{ flex: 1, display: "flex", gap: "0.5rem" }}>{children}</div>
      <Button
        hasIconOnly
        kind="ghost"
        size="md"
        iconDescription="Remove"
        renderIcon={TrashCan}
        onClick={onRemove}
      />
    </div>
  );
}
