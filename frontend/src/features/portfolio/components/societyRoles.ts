import type { SocietyRole } from "@/features/portfolio/api/society";

// Roles in rank order; office bearers are every role above a plain member.
export const SOCIETY_ROLES: { value: SocietyRole; label: string; color: string }[] = [
  { value: "leader", label: "Leader", color: "gold" },
  { value: "deputy_leader", label: "Deputy leader", color: "orange" },
  { value: "secretary", label: "Secretary", color: "blue" },
  { value: "treasurer", label: "Treasurer", color: "green" },
  { value: "member", label: "Member", color: "default" },
];

export const roleInfo = (role: SocietyRole) => SOCIETY_ROLES.find((r) => r.value === role) ?? SOCIETY_ROLES[SOCIETY_ROLES.length - 1];

export const roleRank = (role: SocietyRole) => SOCIETY_ROLES.findIndex((r) => r.value === role);
