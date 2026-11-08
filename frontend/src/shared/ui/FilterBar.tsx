import type { ReactNode } from "react";
import { Input } from "antd";
import { SearchOutlined } from "@ant-design/icons";

export interface FilterControl {
  label: string;
  node: ReactNode;
}

interface Props {
  search: { value: string; onChange: (value: string) => void; placeholder?: string };
  controls?: FilterControl[];
}

// Search box plus any filter controls; each control declares its own accessible
// label so a filter bar can't ship a control screen readers can't name.
export default function FilterBar({ search, controls }: Props) {
  return (
    <div className="os-filter-bar">
      <div className="os-filter-bar__search">
        <Input
          allowClear
          type="search"
          aria-label={search.placeholder ?? "Search"}
          prefix={<SearchOutlined />}
          placeholder={search.placeholder ?? "Search…"}
          value={search.value}
          onChange={(e) => search.onChange(e.target.value)}
        />
      </div>
      {controls?.map((c) => (
        <div key={c.label} className="os-filter-bar__control" role="group" aria-label={c.label}>
          {c.node}
        </div>
      ))}
    </div>
  );
}
