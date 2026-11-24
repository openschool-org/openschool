// antd Tag colours for discipline severity; undefined is the neutral default tag.
export const SEVERITY_COLOR: Record<"minor" | "major" | "severe", string | undefined> = {
  minor: undefined,
  major: "warning",
  severe: "error",
};

// antd Tag colour per notification priority; undefined is the neutral default tag.
// antd Tag colour and label per timetable status; undefined colour is the neutral tag.
export const TIMETABLE_STATUS_TAG: Record<"draft" | "under_review" | "approved" | "published" | "rejected" | "archived", { color?: string; label: string }> = {
  draft: { label: "Draft" },
  under_review: { color: "processing", label: "Under review" },
  approved: { color: "cyan", label: "Approved" },
  published: { color: "success", label: "Published" },
  rejected: { color: "error", label: "Rejected" },
  archived: { color: "magenta", label: "Archived" },
};

// Solid pill tone for each timetable status (shared/ui/Pill).
export const TIMETABLE_STATUS_TONE: Record<keyof typeof TIMETABLE_STATUS_TAG, "neutral" | "warning" | "info" | "success" | "danger" | "purple"> = {
  draft: "neutral",
  under_review: "warning",
  approved: "info",
  published: "success",
  rejected: "danger",
  archived: "purple",
};
