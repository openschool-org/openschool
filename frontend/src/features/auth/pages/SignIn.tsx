import { SignInButton, useThunderID } from "@thunderid/react";
import { Navigate, Link } from "react-router";
import { Button } from "antd";
import { useSetupStatus } from "@/features/school/queries/useSetup";
import AuthCard from "@/shared/ui/AuthCard";

export default function SignIn() {
  const { isSignedIn, isLoading } = useThunderID();
  const { data: setupStatus, isLoading: setupLoading } = useSetupStatus();

  if (isLoading || setupLoading) return <div className="os-full-height" />;
  if (isSignedIn) return <Navigate to="/" replace />;
  if (setupStatus?.needs_setup) return <Navigate to="/setup" replace />;

  return (
    <AuthCard
      title="Sign in"
      subtitle="Use the account your school gave you to continue."
      footer={
        <>
          <Link to="/forgot-password">Forgot password?</Link>
          <span>First time here? <Link to="/activate">Activate your account</Link></span>
        </>
      }
    >
      <SignInButton>
        {({ signIn, isLoading: signingIn }) => (
          <Button type="primary" size="large" block loading={signingIn} onClick={() => signIn()}>
            Sign in
          </Button>
        )}
      </SignInButton>
    </AuthCard>
  );
}
