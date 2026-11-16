import type { ReactNode } from "react";

interface Props {
  title: ReactNode;
  subtitle?: ReactNode;
  aside?: ReactNode;
}

// Page header shared by every portal's dashboard, matching the admin dashboard.
export default function DashboardHero({ title, subtitle, aside }: Props) {
  return (
    <header className="os-dash-hero">
      <div className="os-min-w-0">
        <h1 className="os-dash-hero__title">{title}</h1>
        {subtitle && <p className="os-dash-hero__sub">{subtitle}</p>}
      </div>
      {aside && <div className="os-dash-hero__aside">{aside}</div>}
    </header>
  );
}
