import { useThunderID } from "@thunderid/react";
import { Navigate, useLocation } from "react-router";
import { IDLE_TIMEOUT_MS, useIdleLogout } from "@/shared/auth/useIdleLogout";
import IdleWarningModal from "@/shared/auth/IdleWarningModal";
import { DelayedSkeletonShell } from "@/shared/ui/SkeletonShell";

export default function ProtectedRoute({
  children,
  idleTimeoutMs = IDLE_TIMEOUT_MS,
}: {
  children: React.ReactNode;
  // Admin routes pass ADMIN_IDLE_TIMEOUT_MS; every other portal keeps the
  // shorter default, since lab and staffroom PCs are shared (S12).
  idleTimeoutMs?: number;
}) {
  const { isSignedIn, isLoading } = useThunderID();
  const location = useLocation();
  const { warning, staySignedIn, signOutNow } = useIdleLogout(idleTimeoutMs);

  if (isLoading) return <DelayedSkeletonShell />;

  if (!isSignedIn) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }

  return (
    <>
      <IdleWarningModal open={warning} onStaySignedIn={staySignedIn} onSignOut={signOutNow} />
      {children}
    </>
  );
}
