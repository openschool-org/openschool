import type { ReactNode } from "react";
import {
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableSelectAll,
  TableSelectRow,
  TableToolbar,
  TableToolbarContent,
} from "@carbon/react";
import { usePagination } from "@/shared/hooks/usePagination";
import { useT } from "@/shared/i18n/useT";

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
  sort?: GridSort;
  onSortChange?: (key: string) => void;
  // Row ids currently ticked; passing this turns on the checkbox column.
  selected?: Set<string>;
  onSelectionChange?: (next: Set<string>) => void;
}

const SORT_STATE = { asc: "ASC", desc: "DESC" } as const;

// Carbon table with pagination, count label and optional toolbar, sorting and selection.
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

  const pageIds = pageRows.map(getRowId);
  const selectable = !!selected && !!onSelectionChange;
  const allOnPage = selectable && pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someOnPage = selectable && pageIds.some((id) => selected.has(id));

  const toggleRow = (id: string) => {
    if (!selectable) return;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  const togglePage = () => {
    if (!selectable) return;
    const next = new Set(selected);
    for (const id of pageIds) {
      if (allOnPage) next.delete(id);
      else next.add(id);
    }
    onSelectionChange(next);
  };

  return (
    <>
      <TableContainer className="os-table-container">
        {(countLabel || toolbar) && (
          <TableToolbar className="os-grid__toolbar">
            <TableToolbarContent>
              {countLabel && <span className="os-grid__count">{countLabel(pageRows.length, total)}</span>}
              {toolbar}
            </TableToolbarContent>
          </TableToolbar>
        )}
        <Table className={`os-table os-table--stack${noHover ? " os-table--no-hover" : ""}${className ? ` ${className}` : ""}`}>
          <TableHead>
            <TableRow>
              {selectable && (
                <TableSelectAll
                  id="grid-select-all"
                  name="grid-select-all"
                  ariaLabel="Select all rows on this page"
                  checked={allOnPage}
                  indeterminate={someOnPage && !allOnPage}
                  onSelect={togglePage}
                />
              )}
              {columns.map((c) => (
                <TableHeader
                  key={c.key}
                  className={c.align === "end" ? "os-grid__cell--end" : undefined}
                  isSortable={!!c.sortable && !!onSortChange}
                  isSortHeader={sort?.key === c.key}
                  sortDirection={sort?.key === c.key ? SORT_STATE[sort.direction] : "NONE"}
                  onClick={c.sortable && onSortChange ? () => onSortChange(c.key) : undefined}
                >
                  {c.header}
                </TableHeader>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {pageRows.map((row) => {
              const id = getRowId(row);
              return (
                <TableRow
                  key={id}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={onRowClick ? (e) => { if (e.key === "Enter") onRowClick(row); } : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  className={onRowClick ? "os-pointer os-focus-ring" : undefined}
                  isSelected={selectable ? selected.has(id) : undefined}
                >
                  {selectable && (
                    <TableSelectRow
                      id={`grid-select-${id}`}
                      name={`grid-select-${id}`}
                      ariaLabel="Select row"
                      checked={selected.has(id)}
                      onSelect={(e) => {
                        e.stopPropagation();
                        toggleRow(id);
                      }}
                    />
                  )}
                  {columns.map((c) => (
                    <TableCell key={c.key} data-label={c.header} className={c.align === "end" ? "os-grid__cell--end" : undefined}>
                      {c.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      {pagination && (
        <Pagination
          totalItems={total}
          page={paging.page}
          pageSize={paging.pageSize}
          pageSizes={pageSizes}
          onChange={paging.onChange}
          itemsPerPageText={t("pager.itemsPerPage")}
          itemRangeText={(min, max, count) => t("pager.range", { min, max, total: count })}
          pageRangeText={(_current, count) => t("pager.pageRange", { total: count })}
          backwardText={t("pager.previous")}
          forwardText={t("pager.next")}
          pageNumberText={t("pager.pageNumber")}
        />
      )}
    </>
  );
}
