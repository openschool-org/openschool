import type { ReactNode } from "react";

export type PillTone = "success" | "warning" | "danger" | "info" | "accent" | "purple" | "gold" | "neutral";

interface Props {
  tone?: PillTone;
  // "solid" (white text) is for statuses; "soft" (pale tint, dark text) is for labels such as roles and houses.
  variant?: "solid" | "soft";
  icon?: ReactNode;
  children: ReactNode;
}

// The one tag style in the app: a pill coloured by meaning.
export default function Pill({ tone = "neutral", variant = "solid", icon, children }: Props) {
  return (
    <span className={`os-pill-solid is-${tone}${variant === "soft" ? " is-soft" : ""}`}>
      {icon}
      {children}
    </span>
  );
}
