import type { ReactNode } from "react";
import { CheckmarkFilled } from "@carbon/icons-react";

interface Props {
  title: string;
  subtitle: ReactNode;
  children?: ReactNode;
  success?: boolean;
}

// The signed-out card layout shared by both activation steps.
export default function AuthShell({ title, subtitle, children, success = false }: Props) {
  return (
    <div className="os-signin-wrapper">
      <div className={success ? "os-auth-card os-auth-card--center" : "os-auth-card"}>
        {success ? (
          <div className="os-auth-card__success-icon">
            <CheckmarkFilled size={28} />
          </div>
        ) : (
          <div className="os-auth-card__brand">
            <img src="/favicon.webp" alt="OpenSchool" width={36} height={36} className="os-auth-card__logo" />
            <span className="os-auth-card__brand-name">OpenSchool</span>
          </div>
        )}
        <h1 className="os-auth-card__title">{title}</h1>
        <p className="os-auth-card__subtitle">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}
