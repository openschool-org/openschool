import { useLocation } from "react-router";
import { Tabs } from "antd";
import SubjectsPanel from "@/features/curriculum/components/SubjectsPanel";
import CurriculumPanel from "@/features/curriculum/components/CurriculumPanel";
import PageHeader from "@/shared/ui/PageHeader";

export default function SubjectsCurriculum() {
  const location = useLocation();
  const defaultTab = location.pathname.startsWith("/curriculum") ? "curriculum" : "subjects";

  return (
    <div className="os-page">
      <PageHeader title="Subjects &amp; curriculum" subtitle="The subject catalogue and the groups students choose from." />

      <Tabs
        className="os-detail-tabs"
        defaultActiveKey={defaultTab}
        aria-label="Subjects and curriculum sections"
        items={[
          { key: "subjects", label: "Subjects", children: <SubjectsPanel /> },
          { key: "curriculum", label: "Curriculum", children: <CurriculumPanel /> },
        ]}
      />
    </div>
  );
}
