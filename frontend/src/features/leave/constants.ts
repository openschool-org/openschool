import type { DayPart, LeaveStatus, LeaveType } from "@/features/leave/api/leave";

// Mirrors the rules in backend/internal/modules/leave/rules.go.
export const LEAVE_TYPES: { value: LeaveType; label: string; help: string }[] = [
  { value: "casual", label: "Casual leave", help: "21 days a year. Can be taken as a morning or afternoon." },
  { value: "sick", label: "Medical leave", help: "20 days a year. Hand in a medical certificate for more than 2 days." },
  { value: "short", label: "Short leave", help: "Leave school early or come late: up to 90 minutes, twice a month." },
  { value: "duty", label: "Duty leave", help: "Official work away from school, such as paper marking or a seminar." },
  { value: "maternity", label: "Maternity leave", help: "84 working days on full pay for each confinement." },
  { value: "no_pay", label: "No-pay leave", help: "Leave without salary once other leave is used up." },
];

export const LEAVE_TYPE_LABELS = Object.fromEntries(LEAVE_TYPES.map((t) => [t.value, t.label])) as Record<LeaveType, string>;

export const DAY_PARTS: { value: DayPart; label: string }[] = [
  { value: "full", label: "Full day" },
  { value: "morning", label: "Morning (before the interval)" },
  { value: "afternoon", label: "Afternoon (after the interval)" },
];

export const HALF_DAY_TYPES: LeaveType[] = ["casual", "duty"];

export const LEAVE_STATUS_TAGS: Record<LeaveStatus, { label: string; type: "blue" | "green" | "red" | "gray" }> = {
  pending: { label: "Waiting for approval", type: "blue" },
  approved: { label: "Approved", type: "green" },
  rejected: { label: "Not approved", type: "red" },
  cancelled: { label: "Cancelled", type: "gray" },
};
