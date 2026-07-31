import type { ComponentType, ReactNode } from "react";

interface StatusViewProps {
  icon: ComponentType<{ size?: number }>;
  title: string;
  subtitle: string;
  actions?: ReactNode;
  /** "page" sits inline within a layout's content area (404, coming soon).
   *  "fullscreen" takes over the viewport in a card, like sign-in/setup —
   *  for states reached before/outside any layout (access restricted). */
  variant?: "page" | "fullscreen";
}

function StatusBody({ icon: Icon, title, subtitle, actions }: Omit<StatusViewProps, "variant">) {
  return (
    <>
      <div className="os-status__icon">
        <Icon size={28} />
      </div>
      <h2 className="os-status__title">{title}</h2>
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
