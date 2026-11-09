import { Button, Tag } from "antd";
import { CloseOutlined } from "@ant-design/icons";

export interface ActiveFilter {
  key: string;
  label: string;
  value: string;
}

interface Props {
  filters: ActiveFilter[];
  onClear: (key: string) => void;
  onClearAll: () => void;
}

export default function ActiveFilterTags({ filters, onClear, onClearAll }: Props) {
  if (filters.length === 0) return null;
  return (
    <div className="os-filter-tags">
      <span className="os-filter-tags__label">Active filters:</span>
      {filters.map((f) => (
        <Tag
          key={f.key}
          color="processing"
          closable
          closeIcon={<CloseOutlined aria-label={`Remove ${f.label} filter`} />}
          onClose={(e) => {
            e.preventDefault();
            onClear(f.key);
          }}
        >
          {f.label}: {f.value}
        </Tag>
      ))}
      <Button type="text" size="small" icon={<CloseOutlined />} onClick={onClearAll}>
        Clear all
      </Button>
    </div>
  );
}
