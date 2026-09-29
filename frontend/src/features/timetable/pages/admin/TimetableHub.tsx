import { useNavigate } from "react-router";
import { Tabs, TabList, Tab, TabPanels, TabPanel } from "@carbon/react";
import Timetables from "@/features/timetable/pages/admin/Timetables";
import GenerateTimetable from "@/features/timetable/pages/admin/GenerateTimetable";
import SubjectRequirements from "@/features/timetable/pages/admin/SubjectRequirements";
import TimetableSettings from "@/features/timetable/pages/admin/TimetableSettings";

export type TimetableHubTab = "timetables" | "generate" | "requirements" | "settings";

const TABS: { key: TimetableHubTab; label: string; path: string }[] = [
  { key: "timetables", label: "Timetables", path: "/timetables" },
  { key: "generate", label: "Generate", path: "/timetables/generate" },
  { key: "requirements", label: "Requirements", path: "/subject-requirements" },
  { key: "settings", label: "Settings", path: "/timetable-settings" },
];

export default function TimetableHub({ tab }: { tab: TimetableHubTab }) {
  const navigate = useNavigate();
  const selectedIndex = TABS.findIndex((t) => t.key === tab);

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Timetable</h1>
        </div>
      </div>

      <Tabs selectedIndex={selectedIndex} onChange={({ selectedIndex: i }) => navigate(TABS[i].path)}>
        <TabList aria-label="Timetable sections">
          {TABS.map((t) => (
            <Tab key={t.key}>{t.label}</Tab>
          ))}
        </TabList>
        <TabPanels>
          <TabPanel className="os-py-4 os-px-0"><Timetables inline /></TabPanel>
          <TabPanel className="os-py-4 os-px-0"><GenerateTimetable inline /></TabPanel>
          <TabPanel className="os-py-4 os-px-0"><SubjectRequirements inline /></TabPanel>
          <TabPanel className="os-py-4 os-px-0"><TimetableSettings inline /></TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}
