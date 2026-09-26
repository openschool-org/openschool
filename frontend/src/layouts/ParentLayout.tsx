import PortalShell from "@/layouts/PortalShell";
import { PARENT_NAV, PARENT_ALIASES } from "@/layouts/nav/parent";

export default function ParentLayout() {
  return <PortalShell navGroups={PARENT_NAV} navAliases={PARENT_ALIASES} bottomTabs showLanguage />;
}
