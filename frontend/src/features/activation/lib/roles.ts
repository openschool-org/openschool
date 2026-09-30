import type { ActivationRole } from "@/features/activation/api/activation";

// The "parent" role is shown as Guardian, matching the rest of the app.
export const ROLE_LABELS: Record<ActivationRole, { one: string; many: string; identifier: string }> = {
  student: { one: "Student", many: "Students", identifier: "index number" },
  parent: { one: "Guardian", many: "Guardians", identifier: "NIC number" },
};
