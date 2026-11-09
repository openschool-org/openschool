import type { ReactNode } from "react";
import { Button, Popover } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";

interface Props {
  children: ReactNode;
  label?: string;
}

// Keeps long explanations out of the layout; the short line stays visible.
export default function InfoTip({ children, label = "More information" }: Props) {
  return (
    <Popover trigger="click" placement="bottom" content={<p className="os-infotip__content">{children}</p>}>
      <Button type="text" size="small" shape="circle" className="os-infotip" aria-label={label} icon={<InfoCircleOutlined />} />
    </Popover>
  );
}
