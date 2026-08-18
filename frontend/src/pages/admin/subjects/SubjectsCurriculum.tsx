// This file renders the merged Subjects & Curriculum admin page: a Tabs
// shell (Subjects / Curriculum) around SubjectsPanel and CurriculumPanel,
// serving both the /subjects and /curriculum routes.

import { useLocation } from "react-router";
import { Tabs, TabList, Tab, TabPanels, TabPanel } from "@carbon/react";
import SubjectsPanel from "./components/SubjectsPanel";
import CurriculumPanel from "../curriculum/components/CurriculumPanel";

export default function SubjectsCurriculum() {
  const location = useLocation();
  const defaultSelectedIndex = location.pathname.startsWith("/curriculum") ? 1 : 0;

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Subjects &amp; Curriculum</h1>
          <p className="os-page__subtitle">
            The subject catalogue, and how those subjects are organized into
            curriculum levels and selection groups students pick from.
          </p>
        </div>
      </div>

      <Tabs defaultSelectedIndex={defaultSelectedIndex}>
        <TabList aria-label="Subjects and curriculum sections">
          <Tab>Subjects</Tab>
          <Tab>Curriculum</Tab>
        </TabList>
        <TabPanels>
          <TabPanel style={{ padding: 0 }}>
            <SubjectsPanel />
          </TabPanel>
          <TabPanel style={{ padding: 0 }}>
            <CurriculumPanel />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}
