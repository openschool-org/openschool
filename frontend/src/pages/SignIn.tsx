import { SignInButton, useThunderID } from "@thunderid/react";
import { Navigate } from "react-router";
import { Button } from "@carbon/react";
import { useSetupStatus } from "../queries/useSetup";

export default function SignIn() {
  const { isSignedIn, isLoading } = useThunderID();
  const { data: setupStatus, isLoading: setupLoading } = useSetupStatus();

  if (isLoading || setupLoading) return <div style={{ minHeight: "100vh" }} />;
  if (isSignedIn) return <Navigate to="/" replace />;
  if (setupStatus?.needs_setup) return <Navigate to="/setup" replace />;

  return (
    <div className="os-signin-wrapper">
      <div className="os-signin-card">
        <img src="/favicon.webp" alt="OpenSchool" width={48} height={48} style={{ display: "block", marginBottom: "1rem" }} />
        <h1 style={{ fontSize: "1.75rem", fontWeight: 500, marginBottom: "0.5rem" }}>
          Open<span style={{ color: "#FF6F1B" }}>School</span>
        </h1>
        <p style={{ color: "#525252", marginBottom: "2rem" }}>
          Sign in to continue to your dashboard.
        </p>
        <SignInButton>
          {({ signIn, isLoading }) => (
            <Button
              onClick={() => signIn()}
              disabled={isLoading}
              style={{ width: "100%", maxWidth: "100%" }}
            >
              {isLoading ? "Signing in…" : "Sign In"}
            </Button>
          )}
        </SignInButton>
      </div>
    </div>
  );
}
