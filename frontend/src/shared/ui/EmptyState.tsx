import type { ReactNode } from "react";
import { FileOutlined } from "@ant-design/icons";

interface Props {
  title: string;
  description: string;
  action?: ReactNode;
}

export default function EmptyState({ title, description, action }: Props) {
  return (
    <div className="os-empty">
      <FileOutlined className="os-empty__icon" aria-hidden />
      <p className="os-empty__title">{title}</p>
      <p className="os-empty__desc">{description}</p>
      {action}
    </div>
  );
}
