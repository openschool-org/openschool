import { SignInButton, useThunderID } from "@thunderid/react";
import { Navigate, Link } from "react-router";
import { Button } from "@carbon/react";
import { useSetupStatus } from "@/features/school/queries/useSetup";

export default function SignIn() {
  const { isSignedIn, isLoading } = useThunderID();
  const { data: setupStatus, isLoading: setupLoading } = useSetupStatus();

  if (isLoading || setupLoading) return <div className="os-full-height" />;
  if (isSignedIn) return <Navigate to="/" replace />;
  if (setupStatus?.needs_setup) return <Navigate to="/setup" replace />;

  return (
    <div className="os-signin-wrapper">
      <div className="os-auth-card">
        <div className="os-auth-card__brand">
          <img
            src="/favicon.webp"
            alt="OpenSchool"
            width={36}
            height={36}
            className="os-auth-card__logo"
          />
          <span className="os-auth-card__brand-name">OpenSchool</span>
        </div>
        <h1 className="os-auth-card__title">Sign in</h1>
        <p className="os-auth-card__subtitle">
          Sign in to continue to your dashboard.
        </p>
        <div className="os-auth-card__actions">
          <SignInButton>
            {({ signIn, isLoading }) => (
              <Button
                onClick={() => signIn()}
                disabled={isLoading}
                className="os-full-width-btn"
              >
                {isLoading ? "Signing in…" : "Sign in"}
              </Button>
            )}
          </SignInButton>
        </div>
        <div className="os-auth-card__footer">
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
      </div>
    </div>
  );
}
