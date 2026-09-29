import { Suspense, useEffect, useState } from "react";
import { Routes, Route } from "react-router";
import { useRole } from "@/shared/auth/useRole";
import { useProvisionUser } from "@/shared/auth/useProvisionUser";
import ProtectedRoute from "@/shared/auth/ProtectedRoute";
import ApiAuthBridge from "@/shared/auth/ApiAuthBridge";
import { DelayedSkeletonShell } from "@/shared/ui/SkeletonShell";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import { lazy as page } from "react";
import { publicRoutes } from "@/app/routes/public.routes";
import { adminRoutes } from "@/app/routes/admin.routes";
import { teacherRoutes } from "@/app/routes/teacher.routes";
import { studentRoutes } from "@/app/routes/student.routes";
import { parentRoutes } from "@/app/routes/parent.routes";

const PasswordInterstitial = page(() => import("@/features/auth/pages/PasswordInterstitial"));
const AccessRestricted = page(() => import("@/app/pages/AccessRestricted"));

function DelayedLoadingFallback() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 180);
    return () => window.clearTimeout(timer);
  }, []);

  return visible ? <LoadingSpinner /> : null;
}

// One route tree per role; the role comes from the JWT, not the URL.
function roleRoutes(role: string | null) {
  switch (role) {
    case "admin":
      return adminRoutes();
    case "teacher":
      return teacherRoutes();
    case "student":
      return studentRoutes();
    case "parent":
      return parentRoutes();
    default:
      return <Route path="*" element={<ProtectedRoute><AccessRestricted /></ProtectedRoute>} />;
  }
}

export default function App() {
  const { data: me, isLoading: meLoading } = useProvisionUser();
  const { role, loading } = useRole();

  /*
   * Public routes such as /signin are lazy-loaded too. Keep the root
   * boundary independent from the authenticated application shell while
   * delaying its neutral loading indicator to avoid brief-load flashes. Protected-route loading
   * and in-portal page loading have their own intentional fallbacks below.
   */
  return (
    <Suspense fallback={<DelayedLoadingFallback />}>
      <ApiAuthBridge />
      <Routes>
        {publicRoutes()}
        {loading || meLoading ? (
          <Route path="*" element={<DelayedSkeletonShell />} />
        ) : me?.must_change_password ? (
          <Route path="*" element={<ProtectedRoute><PasswordInterstitial /></ProtectedRoute>} />
        ) : (
          roleRoutes(role)
        )}
      </Routes>
    </Suspense>
  );
}
