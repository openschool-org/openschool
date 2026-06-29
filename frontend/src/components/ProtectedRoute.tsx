import { useThunderID } from "@thunderid/react";
import { useEffect, useRef } from "react";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSignedIn, isLoading, signIn } = useThunderID();
  const signingIn = useRef(false);

  useEffect(() => {
    if (!isLoading && !isSignedIn && !signingIn.current) {
      signingIn.current = true;
      signIn();
    }
  }, [isLoading, isSignedIn, signIn]);

  if (isLoading || !isSignedIn) return <div style={{ minHeight: "100vh" }} />;

  return <>{children}</>;
}
