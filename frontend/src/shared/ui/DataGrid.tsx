import type { ReactNode } from "react";
import { Table } from "antd";
import type { TablePaginationConfig } from "antd";
import { usePagination } from "@/shared/hooks/usePagination";
import { useT } from "@/shared/i18n/useT";
import { gridClassName, rowHandlers, rowSelection, toTableColumns } from "@/shared/ui/dataGridParts";

export interface GridColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: "start" | "end";
  // Only set when the backend can sort by this key; a client sort of one page would mislead.
  sortable?: boolean;
}

interface ServerPaging {
  page: number;
  pageSize: number;
  totalItems: number;
  onChange: (next: { page: number; pageSize: number }) => void;
}

export interface GridSort {
  key: string;
  direction: "asc" | "desc";
}

interface Props<T> {
  rows: T[];
  columns: GridColumn<T>[];
  getRowId: (row: T) => string;
  pageSize?: number;
  pageSizes?: number[];
  // Pass when the backend paginates; rows are then the current page only.
  server?: ServerPaging;
  countLabel?: (shown: number, total: number) => string;
  toolbar?: ReactNode;
  noHover?: boolean;
  // false renders every row with no pager, for short lists inside tabs and panels.
  pagination?: boolean;
  className?: string;
  onRowClick?: (row: T) => void;
  // Extra class per row, e.g. a status tint on a marking grid.
  rowClassName?: (row: T) => string;
  // Pins the header row while scrolling, this many px below the top of the viewport.
  stickyOffset?: number;
  sort?: GridSort;
  onSortChange?: (key: string) => void;
  // Row ids currently ticked; passing this turns on the checkbox column.
  selected?: Set<string>;
  onSelectionChange?: (next: Set<string>) => void;
}

// antd Table with pagination, count label and optional toolbar, sorting and selection.
// Under 42rem each row stacks into a labelled card (see .os-table--stack in _table.scss).
export default function DataGrid<T>({
  rows,
  columns,
  getRowId,
  pageSize = 25,
  pageSizes = [10, 25, 50, 100],
  server,
  countLabel,
  toolbar,
  noHover,
  pagination = true,
  className,
  onRowClick,
  rowClassName,
  stickyOffset,
  sort,
  onSortChange,
  selected,
  onSelectionChange,
}: Props<T>) {
  const { t } = useT();
  const client = usePagination(rows, pageSize);
  const pageRows = server || !pagination ? rows : client.pageItems;
  const paging = server ?? client;
  const total = server ? server.totalItems : rows.length;

  const pager: TablePaginationConfig | false = pagination && total > 0 && {
    total,
    current: paging.page,
    pageSize: paging.pageSize,
    pageSizeOptions: pageSizes,
    showSizeChanger: true,
    showTotal: (count, [min, max]) => t("pager.range", { min, max, total: count }),
    onChange: (page, size) => paging.onChange({ page: size !== paging.pageSize ? 1 : page, pageSize: size }),
  };

  return (
    <div className="os-table-container">
      {(countLabel || toolbar) && (
        <div className="os-grid__toolbar">
          {countLabel && <span className="os-grid__count">{countLabel(pageRows.length, total)}</span>}
          {toolbar}
        </div>
      )}
      <Table<T>
        className={gridClassName(noHover, className)}
        rowKey={getRowId}
        rowClassName={rowClassName ? (row) => rowClassName(row) : undefined}
        sticky={stickyOffset !== undefined ? { offsetHeader: stickyOffset } : undefined}
        columns={toTableColumns(columns, sort, onSortChange)}
        dataSource={pageRows}
        pagination={pager}
        // Sorting is server-side; antd only reports which column was clicked.
        onChange={(_p, _f, sorter) => {
          const key = Array.isArray(sorter) ? sorter[0]?.columnKey : sorter.columnKey;
          if (key && onSortChange) onSortChange(String(key));
        }}
        rowSelection={rowSelection(pageRows, getRowId, selected, onSelectionChange)}
        onRow={rowHandlers(onRowClick)}
        scroll={{ x: "max-content" }}
      />
    </div>
  );
}
