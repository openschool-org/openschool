import { useSearchParams } from "react-router";
import { Tabs } from "antd";
import GeneralSettingsTab from "@/features/school/components/GeneralSettingsTab";
import ActivationTab from "@/features/activation/components/ActivationTab";
import EmailTab from "@/features/email/components/EmailTab";
import HousesPanel from "@/features/school/components/HousesPanel";
import LeaveSettingsCard from "@/features/leave/components/LeaveSettingsCard";
import AuditLog from "@/features/system/components/AuditLog";
import OrphanedAccounts from "@/features/system/components/OrphanedAccounts";
import Automation from "@/features/system/components/Automation";

const TABS = [
  { key: "general", label: "General", render: () => <GeneralSettingsTab /> },
  { key: "houses", label: "Houses", render: () => <HousesPanel /> },
  { key: "leave", label: "Leave", render: () => <LeaveSettingsCard /> },
  { key: "activation", label: "Account activation", render: () => <ActivationTab /> },
  { key: "email", label: "Email", render: () => <EmailTab /> },
  { key: "audit", label: "Audit log", render: () => <AuditLog /> },
  { key: "orphaned", label: "Orphaned accounts", render: () => <OrphanedAccounts /> },
  { key: "automation", label: "Automation", render: () => <Automation inline /> },
];

// Only the open tab is mounted, so each tab's queries run when it is opened.
// The tab lives in ?tab= so other pages can link straight to one (e.g. the audit log).
export default function SettingsPage() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab");
  const tab = TABS.some((t) => t.key === requested) ? requested! : "general";
  const setTab = (key: string) => setParams({ tab: key }, { replace: true });
  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Settings</h1>
          <p className="os-page__subtitle">School details, houses, leave limits, sign-in, email and system tools.</p>
        </div>
      </div>
      <Tabs className="os-detail-tabs" activeKey={tab} onChange={setTab} items={TABS.map((t) => ({ key: t.key, label: t.label, children: t.key === tab ? t.render() : null }))} />
    </div>
  );
}
