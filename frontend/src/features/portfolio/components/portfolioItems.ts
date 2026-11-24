import type { LeadershipRole, PrefectAppointment, StudentActivity, StudentAward } from "@/features/portfolio/api/studentPortfolio";
import type { SocietyMembership } from "@/features/portfolio/api/society";

export type PortfolioKind = "prefect" | "leadership" | "society" | "activity" | "award";

export interface PortfolioItem {
  id: string;
  kind: PortfolioKind;
  title: string;
  detail?: string;
  badge?: string;
  date?: string | null;
}

export interface PortfolioYear {
  yearId: string;
  label: string;
  items: PortfolioItem[];
}

export interface PortfolioSources {
  prefects: PrefectAppointment[];
  societies: SocietyMembership[];
  leadership: LeadershipRole[];
  activities: StudentActivity[];
  awards: StudentAward[];
}

interface Words {
  prefectRank: (rank: string) => string;
  societyRole: (role: string) => string;
  category: (category: string) => string;
  former: (role: string) => string;
  left: (date: string) => string;
}

const KIND_ORDER: PortfolioKind[] = ["prefect", "leadership", "society", "award", "activity"];

// Groups every record by academic year, newest first, with the most senior kinds first inside a year.
export function groupPortfolio(src: PortfolioSources, yearLabels: Record<string, string>, words: Words): PortfolioYear[] {
  const labels = { ...yearLabels };
  src.prefects.forEach((p) => (labels[p.academic_year_id] ??= p.academic_year_label));
  src.societies.forEach((s) => (labels[s.academic_year_id] ??= s.academic_year_label));

  const items: (PortfolioItem & { yearId: string })[] = [
    ...src.prefects.map((p) => ({ id: p.id, yearId: p.academic_year_id, kind: "prefect" as const, title: words.prefectRank(p.rank) })),
    ...src.leadership
      // The Head Prefect title is already shown as a prefect appointment.
      .filter((l) => !src.prefects.some((p) => p.academic_year_id === l.academic_year_id && words.prefectRank(p.rank) === l.title))
      .map((l) => ({ id: l.id, yearId: l.academic_year_id, kind: "leadership" as const, title: l.title, detail: l.scope ?? undefined })),
    ...src.societies.map((s) => ({
      id: s.id, yearId: s.academic_year_id, kind: "society" as const, title: s.society_name, date: s.created_at,
      // A deactivated member keeps the entry, shown as former.
      badge: s.left_at ? words.former(words.societyRole(s.role).toLowerCase()) : words.societyRole(s.role),
      detail: s.left_at ? words.left(s.left_at) : undefined,
    })),
    ...src.awards.map((a) => ({
      id: a.id, yearId: a.academic_year_id, kind: "award" as const, title: a.title,
      detail: a.description ?? undefined, badge: a.category ?? undefined, date: a.awarded_date,
    })),
    ...src.activities.map((a) => ({
      id: a.id, yearId: a.academic_year_id, kind: "activity" as const, title: a.name,
      detail: [a.role, a.achievement].filter(Boolean).join(" · ") || undefined, badge: words.category(a.category),
    })),
  ];

  const years = new Map<string, PortfolioYear>();
  for (const { yearId, ...item } of items) {
    if (!years.has(yearId)) years.set(yearId, { yearId, label: labels[yearId] ?? "", items: [] });
    years.get(yearId)!.items.push(item);
  }
  for (const year of years.values()) year.items.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
  return [...years.values()].sort((a, b) => b.label.localeCompare(a.label));
}
