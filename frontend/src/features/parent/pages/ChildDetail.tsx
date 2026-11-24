import type { ReactNode } from "react";
import { useParams } from "react-router";
import { Tabs } from "antd";
import { useMyChildren } from "@/features/parent/queries/useParent";
import {
  ChildAttendanceTab,
  ChildEnrollmentsTab,
  ChildGuardiansTab,
  ChildMarksTab,
  ChildPortfolioTab,
  ChildProgressReportsTab,
  ChildTimetableTab,
} from "@/features/parent/components/ChildAcademicTabs";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import EmptyState from "@/shared/ui/EmptyState";
import TabSection from "@/shared/ui/TabSection";
import PageHeader from "@/shared/ui/PageHeader";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { useT } from "@/shared/i18n/useT";

export default function ChildDetail() {
  const { t } = useT();
  const { id = "" } = useParams();
  const { data: children, isLoading } = useMyChildren();
  const child = children?.find((c) => c.id === id);
  usePageTitle(child?.full_name);

  if (isLoading) return <LoadingSpinner />;
  const back = { label: t("child.backToChildren"), to: "/" };
  if (!child) {
    return (
      <div className="os-page">
        <PageHeader title={t("child.notFound")} back={back} />
        <EmptyState title={t("child.notFound")} description={t("child.notLinked")} />
      </div>
    );
  }

  // Tabs whose content already has its own cards render without a wrapping card.
  const bare = (node: ReactNode) => <div className="os-mt-4">{node}</div>;
  return (
    <div className="os-page">
      <PageHeader
        back={back}
        title={child.full_name}
        subtitle={[child.index_number, child.grade_name, child.class_name].filter(Boolean).join(" · ")}
      />
      <Tabs
        className="os-detail-tabs"
        aria-label={t("child.sections")}
        items={[
          { key: "attendance", label: t("nav.attendance"), children: bare(<ChildAttendanceTab studentId={child.id} />) },
          { key: "marks", label: t("nav.marks"), children: bare(<ChildMarksTab studentId={child.id} />) },
          { key: "timetable", label: t("nav.timetable"), children: <TabSection title={t("timetable.weekly")}><ChildTimetableTab studentId={child.id} /></TabSection> },
          { key: "enrolments", label: t("child.tab.enrolments"), children: <TabSection title={t("enrol.title")} padded={false}><ChildEnrollmentsTab studentId={child.id} /></TabSection> },
          { key: "progress", label: t("child.tab.progress"), children: <TabSection title={t("progress.title")} padded={false}><ChildProgressReportsTab studentId={child.id} /></TabSection> },
          { key: "portfolio", label: t("child.tab.portfolio"), children: bare(<ChildPortfolioTab studentId={child.id} />) },
          { key: "guardians", label: t("child.tab.guardians"), children: <TabSection title={t("child.section.guardians")} padded={false}><ChildGuardiansTab studentId={child.id} /></TabSection> },
        ]}
      />
    </div>
  );
}
