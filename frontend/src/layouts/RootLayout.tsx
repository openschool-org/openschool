import { Navigate, useLocation } from "react-router";
import { isNotFoundError } from "@/shared/api/errors";
import { useSchool } from "@/features/school/queries/useSchool";
import PortalShell from "@/layouts/PortalShell";
import { ADMIN_NAV, ADMIN_ALIASES } from "@/layouts/nav/admin";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";

export default function RootLayout() {
  const { pathname } = useLocation();
  const { isLoading, error } = useSchool();

  if (isLoading) return <LoadingSpinner label="Checking your school setup…" />;

  // A fresh install has no school row yet; send the admin to the setup wizard first.
  if (isNotFoundError(error) && pathname !== "/school-setup") {
    return <Navigate to="/school-setup" replace />;
  }

  return <PortalShell navGroups={ADMIN_NAV} navAliases={ADMIN_ALIASES} showSearch />;
}
