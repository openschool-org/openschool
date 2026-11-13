import { useLocation } from "react-router";
import { Tabs } from "antd";
import SubjectsPanel from "@/features/curriculum/components/SubjectsPanel";
import CurriculumPanel from "@/features/curriculum/components/CurriculumPanel";

export default function SubjectsCurriculum() {
  const location = useLocation();
  const defaultTab = location.pathname.startsWith("/curriculum") ? "curriculum" : "subjects";

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Subjects &amp; curriculum</h1>
          <p className="os-page__subtitle">The subject catalogue and the groups students choose from.</p>
        </div>
      </div>

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
