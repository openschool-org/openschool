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
import { silentProgressStatus } from "../lib/carbonA11y";
import { isValidSriLankanPhone, PHONE_INVALID_TEXT } from "../lib/phone";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Touched = Partial<Record<"givenName" | "familyName" | "email" | "username" | "phone" | "password" | "confirmPassword", boolean>>;

function Header() {
  return (
    <div className="os-setup-header">
      <img src="/favicon.webp" alt="" width={44} height={44} className="os-setup-header__logo" />
      <div>
        <p className="os-setup-header__title">
          Open<span className="os-signin-card__title-accent">School</span>
        </p>
        <p className="os-setup-header__subtitle">School management, self-hosted</p>
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
  const phoneInvalid = touched.phone && !isValidSriLankanPhone(phone);
  const passwordInvalid = touched.password && password.length < 8;
  const confirmPasswordInvalid = touched.confirmPassword && confirmPassword !== password;

  const canSubmit =
    givenName.trim().length > 0 &&
    familyName.trim().length > 0 &&
    EMAIL_RE.test(email.trim()) &&
    username.trim().length > 0 &&
    isValidSriLankanPhone(phone) &&
    password.length >= 8 &&
    confirmPassword === password;

  const handleSubmit = () => {
    setTouched({
      givenName: true,
      familyName: true,
      email: true,
      username: true,
      phone: true,
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
          <div className="os-setup-success-icon">
            <CheckmarkFilled size={28} />
          </div>
          <h1 className="os-setup-card__title">Admin account created</h1>
          <p className="os-setup-card__subtitle">
            Sign in with the credentials you just set, then head to{" "}
            <strong>Settings</strong> to register your school's details.
          </p>
          <Button href="/signin" className="os-full-width-btn">
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
          <ProgressStep label="Admin account" description="Create the first admin" translateWithId={silentProgressStatus} />
          <ProgressStep label="School setup" description="Register your school" translateWithId={silentProgressStatus} />
        </ProgressIndicator>

        <p className="os-setup-card__intro">
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
          <div className="os-setup-name-grid">
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
            onBlur={() => markTouched("phone")}
            invalid={!!phoneInvalid}
            invalidText={PHONE_INVALID_TEXT}
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
            className="os-full-width-btn"
          >
            {registerAdmin.isPending ? "Creating admin account…" : "Create Admin Account"}
          </Button>

          <div className="os-setup-signin-link">
            Already set up an admin account?{" "}
            <SignInButton>
              {({ signIn, isLoading: signInLoading }) => (
                <button
                  type="button"
                  onClick={() => signIn()}
                  disabled={signInLoading}
                  className="os-setup-signin-link__btn"
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
