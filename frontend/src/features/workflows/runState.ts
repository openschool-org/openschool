import type { RunState } from "@/features/workflows/api/workflows";

export const RUN_STATE_TAG: Record<RunState, { type: "blue" | "green" | "red" | "gray" | "warm-gray"; label: string }> = {
  proposed: { type: "blue", label: "Waiting for review" },
  applied: { type: "green", label: "Applied" },
  failed: { type: "red", label: "Failed" },
  reverted: { type: "warm-gray", label: "Reverted" },
  discarded: { type: "gray", label: "Discarded" },
};
