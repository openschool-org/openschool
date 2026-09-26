import { useLocation } from "react-router";
import { Tabs, TabList, Tab, TabPanels, TabPanel } from "@carbon/react";
import SubjectsPanel from "@/features/curriculum/components/SubjectsPanel";
import CurriculumPanel from "@/features/curriculum/components/CurriculumPanel";

export default function SubjectsCurriculum() {
  const location = useLocation();
  const defaultSelectedIndex = location.pathname.startsWith("/curriculum") ? 1 : 0;

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Subjects &amp; curriculum</h1>
          <p className="os-page__subtitle">The subject catalogue and the groups students choose from.</p>
        </div>
      </div>

      <Tabs defaultSelectedIndex={defaultSelectedIndex}>
        <TabList aria-label="Subjects and curriculum sections">
          <Tab>Subjects</Tab>
          <Tab>Curriculum</Tab>
        </TabList>
        <TabPanels>
          <TabPanel className="os-p-0">
            <SubjectsPanel />
          </TabPanel>
          <TabPanel className="os-p-0">
            <CurriculumPanel />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}
