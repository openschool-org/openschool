import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="os-page__header">
      <div className="os-page__header-left">
        <h1 className="os-page__title">{title}</h1>
        {description && <p className="os-page__subtitle">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
