import type { TableColumnsType, TableProps } from "antd";
import type { GridColumn, GridSort } from "@/shared/ui/DataGrid";

const SORT_ORDER = { asc: "ascend", desc: "descend" } as const;

// Maps grid columns to antd columns; a column sorts only when the page handles sorting.
export function toTableColumns<T>(columns: GridColumn<T>[], sort?: GridSort, onSortChange?: (key: string) => void): TableColumnsType<T> {
  return columns.map((c) => {
    const sortable = !!c.sortable && !!onSortChange;
    return {
      key: c.key,
      title: c.header,
      align: c.align === "end" ? "right" : undefined,
      render: (_: unknown, row: T) => c.render(row),
      // data-label lets each cell carry its column name in the phone card layout.
      onCell: () => ({ "data-label": c.header }) as React.HTMLAttributes<HTMLElement>,
      sorter: sortable,
      sortOrder: sortable ? (sort?.key === c.key ? SORT_ORDER[sort.direction] : null) : undefined,
      sortDirections: sortable ? ["ascend", "descend", "ascend"] : undefined,
    };
  });
}

// Checkbox column bound to a selection that can span pages: ticking on this page keeps other pages' ticks.
export function rowSelection<T>(
  pageRows: T[],
  getRowId: (row: T) => string,
  selected?: Set<string>,
  onSelectionChange?: (next: Set<string>) => void,
): TableProps<T>["rowSelection"] {
  if (!selected || !onSelectionChange) return undefined;
  return {
    selectedRowKeys: pageRows.map(getRowId).filter((id) => selected.has(id)),
    onChange: (keys) => {
      const next = new Set(selected);
      for (const row of pageRows) next.delete(getRowId(row));
      for (const k of keys) next.add(String(k));
      onSelectionChange(next);
    },
  };
}

// Clickable rows also open on Enter and take keyboard focus.
export function rowHandlers<T>(onRowClick?: (row: T) => void): TableProps<T>["onRow"] {
  if (!onRowClick) return undefined;
  return (row) => ({
    onClick: () => onRowClick(row),
    onKeyDown: (e) => {
      if (e.key === "Enter") onRowClick(row);
    },
    tabIndex: 0,
    className: "os-pointer os-focus-ring",
  });
}

export function gridClassName(noHover?: boolean, className?: string): string {
  return ["os-grid os-table--stack", noHover ? "os-table--no-hover" : "", className ?? ""].filter(Boolean).join(" ");
}
