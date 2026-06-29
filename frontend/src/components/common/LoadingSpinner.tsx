import { InlineLoading } from "@carbon/react";

export default function LoadingSpinner() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem",
      }}
    >
      <InlineLoading description="Loading…" status="active" />
    </div>
  );
}
