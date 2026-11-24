import { Progress, Skeleton } from "antd";
import type { MyStudentProfile } from "@/features/students/api/studentSelf";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useCurrentTerm } from "@/features/school/queries/useTerms";
import { formatDayMonthYear, fromYmd, todayISODate } from "@/shared/lib/date";
import { useT } from "@/shared/i18n/useT";

const DAY_MS = 24 * 60 * 60 * 1000;

// Share of the term already gone and whole days left, from today's date.
function termProgress(start: string | null, end: string | null) {
  const from = fromYmd(start);
  const to = fromYmd(end);
  const today = fromYmd(todayISODate());
  if (!from || !to || !today || to <= from) return null;
  const percent = Math.min(100, Math.max(0, Math.round(((today.getTime() - from.getTime()) / (to.getTime() - from.getTime())) * 100)));
  const daysLeft = Math.max(0, Math.round((to.getTime() - today.getTime()) / DAY_MS));
  return { percent, daysLeft };
}

// Where the student is in the school year: year, term, class and house.
export default function StudentContextStrip({ profile }: { profile: MyStudentProfile }) {
  const { t } = useT();
  const year = useCurrentAcademicYear();
  const term = useCurrentTerm();
  const progress = term.data ? termProgress(term.data.start_date, term.data.end_date) : null;

  return (
    <section className="os-dash-context" aria-label={t("student.currentTerm")}>
      <div className="os-dash-context__item">
        <p className="os-dash-context__label">{t("student.academicYear")}</p>
        {year.isLoading ? <Skeleton.Input size="small" /> : <p className="os-dash-context__value">{year.data?.label ?? "-"}</p>}
        {profile.grade_name && <p className="os-dash-context__meta">{profile.grade_name}</p>}
      </div>
      <div className="os-dash-context__item">
        <p className="os-dash-context__label">{t("student.currentTerm")}</p>
        {term.isLoading ? (
          <Skeleton.Input size="small" />
        ) : term.data ? (
          <>
            <p className="os-dash-context__value">{term.data.name}</p>
            {progress && <Progress percent={progress.percent} showInfo={false} size="small" />}
            <p className="os-dash-context__meta">
              {progress
                ? t("student.termDaysLeft", { days: progress.daysLeft, date: formatDayMonthYear(term.data.end_date) })
                : t("student.termEnds", { date: formatDayMonthYear(term.data.end_date) })}
            </p>
          </>
        ) : (
          <p className="os-dash-context__value">{t("student.noTerm")}</p>
        )}
      </div>
      <div className="os-dash-context__item">
        <p className="os-dash-context__label">{t("student.myClass")}</p>
        <p className="os-dash-context__value">{profile.class_name ?? "-"}</p>
        {profile.form_teacher_name && <p className="os-dash-context__meta">{t("student.formTeacher", { name: profile.form_teacher_name })}</p>}
      </div>
      <div className="os-dash-context__item">
        <p className="os-dash-context__label">{t("student.house")}</p>
        <p className="os-dash-context__value">{profile.house_name ?? "-"}</p>
        <p className="os-dash-context__meta">{profile.index_number}</p>
      </div>
    </section>
  );
}
