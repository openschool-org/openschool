import { useNavigate } from "react-router";
import { Tabs } from "antd";
import Timetables from "@/features/timetable/pages/admin/Timetables";
import GenerateTimetable from "@/features/timetable/pages/admin/GenerateTimetable";
import SubjectRequirements from "@/features/timetable/pages/admin/SubjectRequirements";
import TimetableSettings from "@/features/timetable/pages/admin/TimetableSettings";

export type TimetableHubTab = "timetables" | "generate" | "requirements" | "settings";

const PANELS: Record<TimetableHubTab, React.ReactNode> = {
  timetables: <Timetables inline />,
  generate: <GenerateTimetable inline />,
  requirements: <SubjectRequirements inline />,
  settings: <TimetableSettings inline />,
};

const TABS: { key: TimetableHubTab; label: string; path: string }[] = [
  { key: "timetables", label: "Timetables", path: "/timetables" },
  { key: "generate", label: "Generate", path: "/timetables/generate" },
  { key: "requirements", label: "Requirements", path: "/subject-requirements" },
  { key: "settings", label: "Settings", path: "/timetable-settings" },
];

export default function TimetableHub({ tab }: { tab: TimetableHubTab }) {
  const navigate = useNavigate();

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Timetable</h1>
          <p className="os-page__subtitle">Class timetables, automatic generation, subject requirements and the school day.</p>
        </div>
      </div>

      {/* Each tab has its own URL; only the active panel is mounted. */}
      <Tabs
        className="os-detail-tabs"
        activeKey={tab}
        onChange={(key) => navigate(TABS.find((t) => t.key === key)?.path ?? "/timetables")}
        destroyOnHidden
        items={TABS.map((t) => ({ key: t.key, label: t.label, children: t.key === tab ? PANELS[t.key] : null }))}
      />
    </div>
  );
}
