import { Progress, Skeleton } from "antd";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useCurrentTerm } from "@/features/school/queries/useTerms";
import type { ContextItem } from "@/shared/ui/ContextStrip";
import { formatDayMonthYear, fromYmd, todayISODate } from "@/shared/lib/date";
import { useT } from "@/shared/i18n/useT";

const DAY_MS = 24 * 60 * 60 * 1000;

// Share of the term already gone and whole days left, from today's date.
export function termProgress(start: string | null, end: string | null) {
  const from = fromYmd(start);
  const to = fromYmd(end);
  const today = fromYmd(todayISODate());
  if (!from || !to || !today || to <= from) return null;
  const percent = Math.min(100, Math.max(0, Math.round(((today.getTime() - from.getTime()) / (to.getTime() - from.getTime())) * 100)));
  const daysLeft = Math.max(0, Math.round((to.getTime() - today.getTime()) / DAY_MS));
  return { percent, daysLeft };
}

// The academic year and current term cells every dashboard's context strip starts with.
export function useYearTermItems(yearMeta?: string | null): ContextItem[] {
  const { t } = useT();
  const year = useCurrentAcademicYear();
  const term = useCurrentTerm();
  const progress = term.data ? termProgress(term.data.start_date, term.data.end_date) : null;
  const loading = <Skeleton.Input size="small" />;

  return [
    { key: "year", label: t("student.academicYear"), value: year.isLoading ? loading : (year.data?.label ?? "-"), meta: yearMeta ?? undefined },
    {
      key: "term",
      label: t("student.currentTerm"),
      value: term.isLoading ? loading : (term.data?.name ?? t("student.noTerm")),
      extra: progress ? <Progress percent={progress.percent} showInfo={false} size="small" /> : undefined,
      meta: term.data
        ? progress
          ? t("student.termDaysLeft", { days: progress.daysLeft, date: formatDayMonthYear(term.data.end_date) })
          : t("student.termEnds", { date: formatDayMonthYear(term.data.end_date) })
        : undefined,
    },
  ];
}
