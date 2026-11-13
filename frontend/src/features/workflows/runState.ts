import type { RunState } from "@/features/workflows/api/workflows";

// antd Tag colour and label per run state; undefined colour is the neutral tag.
export const RUN_STATE_TAG: Record<RunState, { color?: string; label: string }> = {
  proposed: { color: "processing", label: "Waiting for review" },
  applied: { color: "success", label: "Applied" },
  failed: { color: "error", label: "Failed" },
  reverted: { color: "warning", label: "Reverted" },
  discarded: { label: "Discarded" },
};
