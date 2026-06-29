import React from "react";
import { DocumentBlank } from "@carbon/icons-react";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1rem",
        textAlign: "center",
      }}
    >
      <DocumentBlank size={40} style={{ fill: "#c6c6c6", marginBottom: "1rem" }} />
      <p style={{ margin: "0 0 0.375rem", fontWeight: 600, fontSize: "1rem", color: "#161616" }}>
        {title}
      </p>
      <p style={{ margin: "0 0 1.5rem", fontSize: "0.875rem", color: "#525252", maxWidth: "26rem" }}>
        {description}
      </p>
      {action && action}
    </div>
  );
}
