import { useThunderID } from "@thunderid/react";
import { Navigate, useLocation } from "react-router";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSignedIn, isLoading } = useThunderID();
  const location = useLocation();

  if (isLoading) return <div style={{ minHeight: "100vh" }} />;

  if (!isSignedIn) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
