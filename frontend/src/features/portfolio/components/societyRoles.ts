import type { SocietyRole } from "@/features/portfolio/api/society";
import type { PillTone } from "@/shared/ui/Pill";

// Roles in rank order; office bearers are every role above a plain member.
export const SOCIETY_ROLES: { value: SocietyRole; label: string; tone: PillTone }[] = [
  { value: "leader", label: "Leader", tone: "gold" },
  { value: "deputy_leader", label: "Deputy leader", tone: "warning" },
  { value: "secretary", label: "Secretary", tone: "info" },
  { value: "treasurer", label: "Treasurer", tone: "success" },
  { value: "member", label: "Member", tone: "neutral" },
];

export const roleInfo = (role: SocietyRole) => SOCIETY_ROLES.find((r) => r.value === role) ?? SOCIETY_ROLES[SOCIETY_ROLES.length - 1];

export const roleRank = (role: SocietyRole) => SOCIETY_ROLES.findIndex((r) => r.value === role);
