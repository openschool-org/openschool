import { ACCENT } from "../constants";

export default function StepShell({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <div
          style={{
            width: "2.5rem",
            height: "2.5rem",
            borderRadius: "50%",
            background: "#edf2fa",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={20} style={{ fill: ACCENT }} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600, color: "#161616" }}>{title}</h2>
          <p style={{ margin: 0, fontSize: "0.8125rem", color: "#525252" }}>{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
