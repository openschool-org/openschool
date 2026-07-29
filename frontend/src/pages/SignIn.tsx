import { SignInButton, useThunderID } from "@thunderid/react";
import { Navigate } from "react-router";
import { Button } from "@carbon/react";

export default function SignIn() {
  const { isSignedIn, isLoading } = useThunderID();

  if (isLoading) return <div style={{ minHeight: "100vh" }} />;
  if (isSignedIn) return <Navigate to="/" replace />;

  return (
    <div className="os-signin-wrapper">
      <div className="os-signin-card">
        <h1 style={{ fontSize: "1.75rem", fontWeight: 500, marginBottom: "0.5rem" }}>
          OpenSchool
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
