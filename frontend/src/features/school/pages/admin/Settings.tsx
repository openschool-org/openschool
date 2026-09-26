import { Tabs, TabList, Tab, TabPanels, TabPanel } from "@carbon/react";
import GeneralSettingsTab from "@/features/school/components/GeneralSettingsTab";
import HousesPanel from "@/features/school/components/HousesPanel";
import AuditLog from "@/features/system/components/AuditLog";
import OrphanedAccounts from "@/features/system/components/OrphanedAccounts";
import Automation from "@/features/system/components/Automation";

export default function SettingsPage() {
  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Settings</h1>
          <p className="os-page__subtitle">School configuration and system preferences</p>
        </div>
      </div>

      <Tabs>
        <TabList aria-label="Settings sections">
          <Tab>General</Tab>
          <Tab>Houses</Tab>
          <Tab>Audit log</Tab>
          <Tab>Orphaned accounts</Tab>
          <Tab>Automation</Tab>
        </TabList>
        <TabPanels>
          <TabPanel className="os-p-0"><GeneralSettingsTab /></TabPanel>
          <TabPanel className="os-p-0"><div className="os-mt-4"><HousesPanel /></div></TabPanel>
          <TabPanel className="os-p-0"><div className="os-mt-4"><AuditLog /></div></TabPanel>
          <TabPanel className="os-p-0"><div className="os-mt-4"><OrphanedAccounts /></div></TabPanel>
          <TabPanel className="os-p-0"><div className="os-mt-4"><Automation inline /></div></TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}
