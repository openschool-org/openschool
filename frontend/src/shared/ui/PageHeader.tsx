import type { ReactNode } from "react";

interface Props {
  title: ReactNode;
  subtitle?: ReactNode;
  // Buttons or links shown on the right of the header.
  children?: ReactNode;
}

export default function PageHeader({ title, subtitle, children }: Props) {
  return (
    <div className="os-page__header">
      <div className="os-page__header-left">
        <h1 className="os-page__title">{title}</h1>
        {subtitle && <p className="os-page__subtitle">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
