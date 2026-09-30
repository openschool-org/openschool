import { Route } from "react-router";
import { lazy as page } from "react";

const SignIn = page(() => import("@/features/auth/pages/SignIn"));
const FirstRunSetup = page(() => import("@/features/school/pages/FirstRunSetup"));
const ForgotPassword = page(() => import("@/features/auth/pages/ForgotPassword"));
const ResetPassword = page(() => import("@/features/auth/pages/ResetPassword"));
const Activate = page(() => import("@/features/activation/pages/Activate"));
const AccessRestricted = page(() => import("@/app/pages/AccessRestricted"));
const ComingSoon = page(() => import("@/app/pages/ComingSoon"));

// Reachable without a session. Returned as an array because <Routes> needs direct <Route> children.
export function publicRoutes() {
  return [
    <Route key="signin" path="/signin" element={<SignIn />} />,
    <Route key="setup" path="/setup" element={<FirstRunSetup />} />,
    <Route key="forgot" path="/forgot-password" element={<ForgotPassword />} />,
    <Route key="reset" path="/reset-password" element={<ResetPassword />} />,
    <Route key="activate" path="/activate" element={<Activate />} />,
    ...(import.meta.env.DEV
      ? [
          <Route key="dev-restricted" path="/dev/access-restricted" element={<AccessRestricted />} />,
          <Route key="dev-soon" path="/dev/coming-soon" element={<ComingSoon feature="Example Feature" />} />,
        ]
      : []),
  ];
}
