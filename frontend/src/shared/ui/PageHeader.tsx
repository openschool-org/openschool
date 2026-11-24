import type { ReactNode } from "react";
import { Link } from "react-router";
import { ArrowLeftOutlined } from "@ant-design/icons";

interface Back {
  label: string;
  // A route, or a handler when leaving needs a check first (unsaved changes).
  to?: string;
  onClick?: () => void;
}

interface Props {
  title: ReactNode;
  subtitle?: ReactNode;
  // The one way back on every page: a link above the title, on the left.
  back?: Back;
  // Buttons or links shown on the right of the header.
  children?: ReactNode;
}

export default function PageHeader({ title, subtitle, back, children }: Props) {
  return (
    <div className="os-page__header">
      <div className="os-page__header-left">
        {back &&
          (back.to ? (
            <Link to={back.to} className="os-page__back"><ArrowLeftOutlined aria-hidden />{back.label}</Link>
          ) : (
            <button type="button" className="os-page__back" onClick={back.onClick}><ArrowLeftOutlined aria-hidden />{back.label}</button>
          ))}
        <h1 className="os-page__title">{title}</h1>
        {subtitle && <p className="os-page__subtitle">{subtitle}</p>}
      </div>
      {children && <div className="os-page__actions">{children}</div>}
    </div>
  );
}
