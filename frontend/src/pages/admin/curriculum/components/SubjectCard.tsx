import { useState } from "react";
import { Button, Tag } from "@carbon/react";
import { Book, TrashCan, Warning } from "@carbon/icons-react";
import type { GroupSubject } from "../../../../services/curriculum";

// Owns its own hover state so the page does not have to track a hovered id.
export default function SubjectCard({
  subject,
  onRemove,
}: {
  subject: GroupSubject;
  onRemove: () => void;
}) {
  const [hover, setHover] = useState(false);
  const extras = subject.medium_name || subject.prerequisite_note;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: "0.75rem",
        border: `1px solid ${hover ? "#406AAF" : "#e0e0e0"}`,
        borderRadius: "4px",
        background: hover ? "#f7f9fd" : "#fff",
        transition: "border-color 70ms ease, background-color 70ms ease",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Book size={16} style={{ fill: "#406AAF", flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "0.8125rem",
              fontWeight: 500,
              color: "#161616",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={subject.subject_name}
          >
            {subject.subject_name}
          </div>
          <div
            style={{
              fontSize: "0.6875rem",
              fontFamily: "IBM Plex Mono, monospace",
              color: "#8d8d8d",
            }}
          >
            {subject.subject_code}
          </div>
        </div>
        <Button
          hasIconOnly
          kind="ghost"
          size="sm"
          iconDescription="Remove"
          renderIcon={TrashCan}
          onClick={onRemove}
        />
      </div>

      {extras && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          {subject.medium_name && (
            <div>
              <Tag type="purple" size="sm" style={{ margin: 0 }}>
                {subject.medium_name} only
              </Tag>
            </div>
          )}
          {subject.prerequisite_note && (
            <p
              style={{
                margin: 0,
                fontSize: "0.6875rem",
                color: "#525252",
                display: "flex",
                gap: "0.25rem",
              }}
            >
              <Warning size={12} style={{ fill: "#8d8d8d", flexShrink: 0, marginTop: "1px" }} />
              {subject.prerequisite_note}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
