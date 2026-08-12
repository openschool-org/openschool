import { SkeletonText } from "@carbon/react";

export default function LevelRowSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "1.25rem 1.5rem",
        borderBottom: "1px solid #e0e0e0",
        gap: "1rem",
      }}
    >
      <SkeletonText width="1.25rem" />
      <div style={{ flex: 1 }}>
        <div style={{ marginBottom: "0.4rem" }}>
          <SkeletonText width="30%" />
        </div>
        <SkeletonText width="15%" />
      </div>
      <SkeletonText width="4rem" />
    </div>
  );
}
