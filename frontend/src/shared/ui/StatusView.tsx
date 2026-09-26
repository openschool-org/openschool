import type { ComponentType, ReactNode } from "react";

interface StatusViewProps {
  icon: ComponentType<{ size?: number }>;
  title: string;
  subtitle: string;
  actions?: ReactNode;
  badge?: string;
  code?: string;
  /** "page" sits inline within a layout's content area (404, coming soon).
   *  "fullscreen" takes over the viewport in a card, like sign-in/setup -
   *  for states reached before/outside any layout (access restricted). */
  variant?: "page" | "fullscreen";
}

function StatusBody({ icon: Icon, title, subtitle, actions, badge, code }: Omit<StatusViewProps, "variant">) {
  return (
    <>
      {code && <div className="os-status__code">{code}</div>}
      {badge && <div className="os-status__badge">{badge}</div>}
      <div className="os-status__icon">
        <Icon size={32} />
      </div>
      <h1 className="os-status__title">{title}</h1>
      <p className="os-status__subtitle">{subtitle}</p>
      {actions && <div className="os-status__actions">{actions}</div>}
    </>
  );
}

export default function StatusView({ variant = "page", ...props }: StatusViewProps) {
  if (variant === "fullscreen") {
    return (
      <div className="os-signin-wrapper">
        <div className="os-status-card">
          <StatusBody {...props} />
        </div>
      </div>
    );
  }

  return (
    <div className="os-status">
      <StatusBody {...props} />
    </div>
  );
}
