import { Link, useParams } from "react-router";
import { Tabs, TabList, Tab, TabPanels } from "@carbon/react";
import { ArrowLeft } from "@carbon/icons-react";
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
            <ArrowLeft size={16} />
            {t("common.back")}
          </Link>
        </div>
      </div>

      <div className="os-py-6 os-px-8">
        <Tabs>
          <TabList aria-label={t("child.sections")}>
            <Tab>{t("nav.attendance")}</Tab>
            <Tab>{t("nav.marks")}</Tab>
            <Tab>{t("nav.timetable")}</Tab>
            <Tab>{t("child.tab.enrolments")}</Tab>
            <Tab>{t("child.tab.progress")}</Tab>
            <Tab>{t("child.tab.portfolio")}</Tab>
            <Tab>{t("child.tab.guardians")}</Tab>
          </TabList>
          <TabPanels>
            <TabSection title={t("nav.attendance")} padded={false}><ChildAttendanceTab studentId={child.id} /></TabSection>
            <TabSection title={t("marks.termMarks")}><ChildMarksTab studentId={child.id} /></TabSection>
            <TabSection title={t("nav.timetable")}><ChildTimetableTab studentId={child.id} /></TabSection>
            <TabSection title={t("enrol.title")}><ChildEnrollmentsTab studentId={child.id} /></TabSection>
            <TabSection title={t("progress.title")}><ChildProgressReportsTab studentId={child.id} /></TabSection>
            <TabSection title={t("child.section.portfolio")}><StudentPortfolioSummary studentId={child.id} /></TabSection>
            <TabSection title={t("child.section.guardians")}><ChildGuardiansTab studentId={child.id} /></TabSection>
          </TabPanels>
        </Tabs>
      </div>
    </div>
  );
}
