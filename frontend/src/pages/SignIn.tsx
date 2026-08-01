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
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img
            src="/favicon.webp"
            alt="OpenSchool"
            width={48}
            height={48}
            className="os-signin-card__logo"
          />
          <h1 className="os-signin-card__title">OpenSchool</h1>
        </div>
        <p className="os-signin-card__subtitle">
          Sign in to continue to your dashboard.
        </p>
        <SignInButton>
          {({ signIn, isLoading }) => (
            <Button
              onClick={() => signIn()}
              disabled={isLoading}
              className="os-full-width-btn"
            >
              {isLoading ? "Signing in…" : "Sign In"}
            </Button>
          )}
        </SignInButton>
      </div>
    </div>
  );
}
