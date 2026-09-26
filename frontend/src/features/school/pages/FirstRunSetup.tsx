import { useState } from "react";
import { Navigate } from "react-router";
import { SignInButton } from "@thunderid/react";
import { Button, TextInput, PasswordInput, Stack } from "@carbon/react";
import { CheckmarkFilled } from "@carbon/icons-react";
import { useSetupStatus, useRegisterAdmin } from "@/features/school/queries/useSetup";
import { EMAIL_RE } from "@/shared/lib/validation";
import { isValidSriLankanPhone, PHONE_INVALID_TEXT } from "@/shared/lib/phone";
import { validateNewPassword } from "@/shared/auth/password";
import CustomStepper from "@/features/school/components/setup/CustomStepper";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import ErrorSummary from "@/shared/ui/ErrorSummary";
import { useErrorSummary } from "@/shared/hooks/useErrorSummary";

const STEPS = [
  { label: "Admin account", description: "Create the first admin" },
  { label: "School setup", description: "Register your school" },
];

const EMPTY = { givenName: "", familyName: "", email: "", username: "", phone: "", password: "", confirmPassword: "" };
type Field = keyof typeof EMPTY;

// First-run screen: creates the one admin account before the school wizard.
export default function FirstRunSetup() {
  const { data: status, isLoading: statusLoading } = useSetupStatus();
  const registerAdmin = useRegisterAdmin();
  const [form, setForm] = useState(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [done, setDone] = useState(false);
  const { ref: summaryRef, errors: summaryErrors, reveal, recheck } = useErrorSummary();

  if (statusLoading) return <div className="os-full-height" />;
  if (!done && status && !status.needs_setup) return <Navigate to="/signin" replace />;

  const pw = validateNewPassword(form.password, form.confirmPassword);
  const errors: Partial<Record<Field, string>> = {
    givenName: form.givenName.trim() ? undefined : "First name is required.",
    familyName: form.familyName.trim() ? undefined : "Last name is required.",
    email: EMAIL_RE.test(form.email.trim()) ? undefined : "Enter a valid email address.",
    username: form.username.trim() ? undefined : "Username is required.",
    phone: isValidSriLankanPhone(form.phone) ? undefined : PHONE_INVALID_TEXT,
    password: form.password ? pw.passwordError : "Password is required.",
    confirmPassword: form.confirmPassword ? pw.confirmError : "Confirm your password.",
  };
  // pw.passwordError/confirmError are both undefined while the fields are
  // still empty (validateNewPassword only flags a *wrong* value, not a
  // missing one), so canSubmit must also require pw.valid - otherwise the
  // very first admin account could be created with a blank password.
  const canSubmit = pw.valid && Object.values(errors).every((e) => !e);

  const input = (field: Field, labelText: string, extra: Record<string, unknown> = {}) => ({
    id: `setup-${field}`,
    labelText,
    value: form[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [field]: e.target.value })),
    onBlur: () => setTouched((t) => ({ ...t, [field]: true })),
    invalid: !!touched[field] && !!errors[field],
    invalidText: errors[field],
    ...extra,
  });

  const submit = () => {
    const clean = reveal(() => setTouched(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, true]))));
    if (!clean || !canSubmit) return;
    registerAdmin.mutate(
      {
        given_name: form.givenName.trim(),
        family_name: form.familyName.trim(),
        email: form.email.trim(),
        username: form.username.trim(),
        phone_number: form.phone.trim() || undefined,
        password: form.password,
      },
      { onSuccess: () => setDone(true) },
    );
  };

  if (done) {
    return (
      <div className="os-signin-wrapper">
        <div className="os-setup-card os-setup-card--success">
          <div className="os-setup-success-icon"><CheckmarkFilled size={28} /></div>
          <h1 className="os-setup-card__title">Admin account created</h1>
          <p className="os-setup-card__subtitle">
            Sign in with the credentials you just set, then head to <strong>Settings</strong> to register your school's details.
          </p>
          <Button href="/signin" className="os-full-width-btn">Go to sign in</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="os-setup-wrapper">
      <div className="os-setup-shell">
        <section className="os-setup-card" aria-labelledby="setup-title">
          <div className="os-setup-header">
            <img src="/favicon.webp" alt="" width={44} height={44} className="os-setup-header__logo" />
            <p className="os-setup-header__title">Open<span className="os-signin-card__title-accent">School</span></p>
          </div>

          <CustomStepper currentIndex={0} steps={STEPS} />

          <div className="os-setup-card__heading">
            <h2 id="setup-title">Create your admin account</h2>
            <p>Start with the account you'll use to configure and run your school. <strong>This can only be done once.</strong></p>
          </div>

          <MutationErrorNotification isError={registerAdmin.isError} error={registerAdmin.error} title="Could not register admin" fallback="Something went wrong. Please try again." className="os-setup-card__error" />

          <ErrorSummary errors={summaryErrors} />

          <Stack gap={3} className="os-setup-form" ref={summaryRef} onChange={recheck}>
            <div className="os-setup-form__section">
              <div className="os-setup-form__section-heading"><h3>Personal details</h3></div>
              <div className="os-setup-name-grid">
                <TextInput {...input("givenName", "First name")} />
                <TextInput {...input("familyName", "Last name")} />
                <TextInput {...input("phone", "Phone number (optional)")} />
                <TextInput {...input("email", "Email", { type: "email" })} />
                <TextInput {...input("username", "Username (sign-in name)")} />
              </div>
            </div>

            <div className="os-setup-form__section">
              <div className="os-setup-form__section-heading"><h3>Secure your account</h3></div>
              <div className="os-setup-security-grid">
                <PasswordInput {...input("password", "Password", { helperText: "At least 10 characters." })} />
                <PasswordInput {...input("confirmPassword", "Confirm password")} />
              </div>
            </div>

            <div className="os-setup-form__footer">
              <Button onClick={submit} disabled={registerAdmin.isPending} className="os-full-width-btn">
                {registerAdmin.isPending ? "Creating admin account…" : "Create admin account"}
              </Button>
              <div className="os-setup-signin-link">
                Already set up an admin account?{" "}
                <SignInButton>
                  {({ signIn, isLoading }) => (
                    <button type="button" onClick={() => signIn()} disabled={isLoading} className="os-setup-signin-link__btn">
                      {isLoading ? "Signing in…" : "Sign in instead"}
                    </button>
                  )}
                </SignInButton>
              </div>
            </div>
          </Stack>
        </section>
      </div>
    </div>
  );
}
