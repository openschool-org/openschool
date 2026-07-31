import { useState } from "react";
import { Navigate } from "react-router";
import { SignInButton } from "@thunderid/react";
import {
  Button,
  TextInput,
  PasswordInput,
  InlineNotification,
  ProgressIndicator,
  ProgressStep,
  Stack,
} from "@carbon/react";
import { CheckmarkFilled } from "@carbon/icons-react";
import { useSetupStatus, useRegisterAdmin } from "../queries/useSetup";
import { getErrorMessage } from "../lib/errorMessage";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Touched = Partial<Record<"givenName" | "familyName" | "email" | "username" | "password" | "confirmPassword", boolean>>;

function Header() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.75rem" }}>
      <img src="/favicon.webp" alt="" width={44} height={44} style={{ display: "block", flexShrink: 0 }} />
      <div>
        <p style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600, color: "#161616" }}>
          Open<span style={{ color: "#FF6F1B" }}>School</span>
        </p>
        <p style={{ margin: 0, fontSize: "0.75rem", color: "#8d8d8d" }}>School management, self-hosted</p>
      </div>
    </div>
  );
}

export default function Setup() {
  const { data: status, isLoading: statusLoading } = useSetupStatus();
  const registerAdmin = useRegisterAdmin();

  const [givenName, setGivenName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touched, setTouched] = useState<Touched>({});
  const [done, setDone] = useState(false);

  const markTouched = (field: keyof Touched) => setTouched((t) => ({ ...t, [field]: true }));

  if (statusLoading) return <div style={{ minHeight: "100vh" }} />;

  if (!done && status && !status.needs_setup) {
    return <Navigate to="/signin" replace />;
  }

  const givenNameInvalid = touched.givenName && !givenName.trim();
  const familyNameInvalid = touched.familyName && !familyName.trim();
  const emailInvalid = touched.email && !EMAIL_RE.test(email.trim());
  const usernameInvalid = touched.username && !username.trim();
  const passwordInvalid = touched.password && password.length < 8;
  const confirmPasswordInvalid = touched.confirmPassword && confirmPassword !== password;

  const canSubmit =
    givenName.trim().length > 0 &&
    familyName.trim().length > 0 &&
    EMAIL_RE.test(email.trim()) &&
    username.trim().length > 0 &&
    password.length >= 8 &&
    confirmPassword === password;

  const handleSubmit = () => {
    setTouched({
      givenName: true,
      familyName: true,
      email: true,
      username: true,
      password: true,
      confirmPassword: true,
    });
    if (!canSubmit) return;

    registerAdmin.mutate(
      {
        given_name: givenName.trim(),
        family_name: familyName.trim(),
        email: email.trim(),
        username: username.trim(),
        phone_number: phone.trim() || undefined,
        password,
      },
      { onSuccess: () => setDone(true) },
    );
  };

  const errorMessage = registerAdmin.error
    ? getErrorMessage(registerAdmin.error, "Something went wrong. Please try again.")
    : null;

  if (done) {
    return (
      <div className="os-signin-wrapper">
        <div className="os-setup-card" style={{ textAlign: "center" }}>
          <div
            style={{
              width: "3.5rem",
              height: "3.5rem",
              margin: "0 auto 1.25rem",
              borderRadius: "50%",
              background: "#defbe6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CheckmarkFilled size={28} style={{ fill: "#24a148" }} />
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 500, marginBottom: "0.5rem", color: "#161616" }}>
            Admin account created
          </h1>
          <p style={{ color: "#525252", marginBottom: "2rem" }}>
            Sign in with the credentials you just set, then head to{" "}
            <strong>Settings</strong> to register your school's details.
          </p>
          <Button href="/signin" style={{ width: "100%", maxWidth: "100%" }}>
            Go to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="os-signin-wrapper">
      <div className="os-setup-card">
        <Header />

        <ProgressIndicator currentIndex={0} spaceEqually style={{ marginBottom: "1.75rem" }}>
          <ProgressStep label="Admin account" description="Create the first admin" />
          <ProgressStep label="School setup" description="Register your school" />
        </ProgressIndicator>

        <p style={{ color: "#525252", marginBottom: "1.5rem", fontSize: "0.875rem" }}>
          This looks like a new instance. Create the admin account to get
          started - <strong>this can only be done once.</strong>
        </p>

        {errorMessage && (
          <InlineNotification
            kind="error"
            title="Could not register admin"
            subtitle={errorMessage}
            hideCloseButton
            lowContrast
            style={{ marginBottom: "1rem", maxWidth: "100%" }}
          />
        )}

        <Stack gap={5}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <TextInput
              id="setup-given-name"
              labelText="First Name"
              value={givenName}
              onChange={(e) => setGivenName(e.target.value)}
              onBlur={() => markTouched("givenName")}
              invalid={!!givenNameInvalid}
              invalidText="First name is required."
            />
            <TextInput
              id="setup-family-name"
              labelText="Last Name"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              onBlur={() => markTouched("familyName")}
              invalid={!!familyNameInvalid}
              invalidText="Last name is required."
            />
          </div>

          <TextInput
            id="setup-email"
            labelText="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => markTouched("email")}
            invalid={!!emailInvalid}
            invalidText="Enter a valid email address."
          />

          <TextInput
            id="setup-username"
            labelText="Username"
            helperText="Used to sign in - separate from your email."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onBlur={() => markTouched("username")}
            invalid={!!usernameInvalid}
            invalidText="Username is required."
          />

          <TextInput
            id="setup-phone"
            labelText="Phone Number (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <PasswordInput
            id="setup-password"
            labelText="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => markTouched("password")}
            invalid={!!passwordInvalid}
            invalidText="Password must be at least 8 characters."
            helperText="At least 8 characters."
          />
          <PasswordInput
            id="setup-confirm-password"
            labelText="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onBlur={() => markTouched("confirmPassword")}
            invalid={!!confirmPasswordInvalid}
            invalidText="Passwords do not match."
          />

          <Button
            onClick={handleSubmit}
            disabled={registerAdmin.isPending}
            style={{ width: "100%", maxWidth: "100%" }}
          >
            {registerAdmin.isPending ? "Creating admin account…" : "Create Admin Account"}
          </Button>

          <div style={{ textAlign: "center", fontSize: "0.8125rem", color: "#525252" }}>
            Already set up an admin account?{" "}
            <SignInButton>
              {({ signIn, isLoading: signInLoading }) => (
                <button
                  type="button"
                  onClick={() => signIn()}
                  disabled={signInLoading}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    font: "inherit",
                    color: "#406AAF",
                    fontWeight: 500,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  {signInLoading ? "Signing in…" : "Sign in instead"}
                </button>
              )}
            </SignInButton>
          </div>
        </Stack>
      </div>
    </div>
  );
}
