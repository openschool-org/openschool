import type { ReactNode } from "react";
import { CheckCircleFilled } from "@ant-design/icons";

interface Props {
  title: string;
  subtitle: ReactNode;
  children?: ReactNode;
  // Links under a divider at the bottom of the card, one per line.
  footer?: ReactNode;
  // Shows a green tick above the title, for "check your email" style end states.
  success?: boolean;
}

// The signed-out card used by sign in, forgot password and account activation.
export default function AuthCard({ title, subtitle, children, footer, success = false }: Props) {
  return (
    <main className="os-login">
      <div className="os-login__panel">
        <div className="os-login__logo">
          <img src="/b-favicon.webp" alt="" width={32} height={32} />
          <span>OpenSchool</span>
        </div>
        {success && <CheckCircleFilled className="os-login__success" />}
        <h1 className="os-login__title">{title}</h1>
        <p className="os-login__subtitle">{subtitle}</p>
        {children}
        {footer && <div className="os-login__links">{footer}</div>}
      </div>
    </main>
  );
}
