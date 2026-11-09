import { Button, Tooltip } from "antd";
import { DeleteOutlined } from "@ant-design/icons";

interface Props {
  label?: string;
  onClick: () => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

const SIZE = { sm: "small", md: "middle", lg: "large" } as const;

// Icon-only trash button, for the row-level remove action repeated across admin list pages.
export default function RemoveIconButton({ label = "Remove", onClick, disabled, size = "sm" }: Props) {
  return (
    <Tooltip title={label}>
      <Button type="text" danger size={SIZE[size]} aria-label={label} icon={<DeleteOutlined />} disabled={disabled} onClick={onClick} />
    </Tooltip>
  );
}
