import PortalShell from "@/layouts/PortalShell";
import { STUDENT_NAV } from "@/layouts/nav/student";

export default function StudentLayout() {
  return <PortalShell navGroups={STUDENT_NAV} bottomTabs showLanguage />;
}
