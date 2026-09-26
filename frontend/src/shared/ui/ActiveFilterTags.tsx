import { Button, Tag } from "@carbon/react";
import { Close } from "@carbon/icons-react";

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

const TAG_TYPES = ["cyan", "teal", "purple", "blue", "magenta"] as const;

export default function ActiveFilterTags({ filters, onClear, onClearAll }: Props) {
  if (filters.length === 0) return null;
  return (
    <div className="os-filter-tags">
      <span className="os-filter-tags__label">Active filters:</span>
      {filters.map((f, i) => (
        <Tag key={f.key} type={TAG_TYPES[i % TAG_TYPES.length]} filter onClose={() => onClear(f.key)}>
          {f.label}: {f.value}
        </Tag>
      ))}
      <Button kind="ghost" size="sm" renderIcon={Close} onClick={onClearAll}>
        Clear all
      </Button>
    </div>
  );
}
