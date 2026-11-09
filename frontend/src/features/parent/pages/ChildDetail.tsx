import { Link, useParams } from "react-router";
import { Tabs } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useMyChildren } from "@/features/parent/queries/useParent";
import {
  ChildAttendanceTab,
  ChildEnrollmentsTab,
  ChildGuardiansTab,
  ChildMarksTab,
  ChildProgressReportsTab,
  ChildTimetableTab,
} from "@/features/parent/components/ChildAcademicTabs";
import StudentPortfolioSummary from "@/features/portfolio/components/StudentPortfolioSummary";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import EmptyState from "@/shared/ui/EmptyState";
import TabSection from "@/shared/ui/TabSection";
import { getInitials } from "@/shared/lib/name";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { useT } from "@/shared/i18n/useT";

export default function ChildDetail() {
  const { t } = useT();
  const { id = "" } = useParams();
  const { data: children, isLoading } = useMyChildren();
  const child = children?.find((c) => c.id === id);
  usePageTitle(child?.full_name);

  if (isLoading) return <LoadingSpinner />;
  if (!child) {
    return (
      <div className="os-p-8">
        <EmptyState
          title={t("child.notFound")}
          description={t("child.notLinked")}
          action={<Link to="/" className="os-table__link">{t("child.backToChildren")}</Link>}
        />
      </div>
    );
  }

  return (
    <div className="os-bg-layer-hover os-min-h-content">
      <div className="os-profile__banner">
        <div className="os-profile__avatar">{getInitials(child.full_name)}</div>
        <div className="os-flex-1">
          <p className="os-profile__name">{child.full_name}</p>
          <p className="os-profile__meta">
            {child.index_number}
            {child.class_name ? ` · ${child.class_name}` : ""}
            {child.grade_name ? ` · ${child.grade_name}` : ""}
          </p>
        </div>
        <div className="os-profile__actions">
          <Link to="/" className="os-table__link os-flex os-items-center os-gap-1h">
            <ArrowLeftOutlined aria-hidden />
            {t("common.back")}
          </Link>
        </div>
      </div>

      <div className="os-py-6 os-px-8">
        <Tabs
          aria-label={t("child.sections")}
          items={[
            { key: "attendance", label: t("nav.attendance"), children: <TabSection title={t("nav.attendance")} padded={false}><ChildAttendanceTab studentId={child.id} /></TabSection> },
            { key: "marks", label: t("nav.marks"), children: <TabSection title={t("marks.termMarks")}><ChildMarksTab studentId={child.id} /></TabSection> },
            { key: "timetable", label: t("nav.timetable"), children: <TabSection title={t("nav.timetable")}><ChildTimetableTab studentId={child.id} /></TabSection> },
            { key: "enrolments", label: t("child.tab.enrolments"), children: <TabSection title={t("enrol.title")}><ChildEnrollmentsTab studentId={child.id} /></TabSection> },
            { key: "progress", label: t("child.tab.progress"), children: <TabSection title={t("progress.title")}><ChildProgressReportsTab studentId={child.id} /></TabSection> },
            { key: "portfolio", label: t("child.tab.portfolio"), children: <TabSection title={t("child.section.portfolio")}><StudentPortfolioSummary studentId={child.id} /></TabSection> },
            { key: "guardians", label: t("child.tab.guardians"), children: <TabSection title={t("child.section.guardians")}><ChildGuardiansTab studentId={child.id} /></TabSection> },
          ]}
        />
      </div>
    </div>
  );
}
