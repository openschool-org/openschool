import type { ReactNode } from "react";
import { Empty } from "antd";

interface Props {
  title: string;
  description: string;
  action?: ReactNode;
}

// antd Empty with a title and one line of guidance, used for every "nothing here yet" state.
export default function EmptyState({ title, description, action }: Props) {
  return (
    <Empty
      className="os-empty"
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        <>
          <span className="os-empty__title">{title}</span>
          <span className="os-empty__desc">{description}</span>
        </>
      }
    >
      {action}
    </Empty>
  );
}
