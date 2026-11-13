import { useMemo, useState } from "react";
import { Card, Checkbox, Pagination, Select, Table } from "antd";
import type { TableColumnsType } from "antd";
import type { Column, Row, Section } from "@/features/workflows/api/workflows";
import FilterBar from "@/shared/ui/FilterBar";

interface Props {
  section: Section;
  editable: boolean;
  onEdit: (rowId: string, cells: Record<string, string>) => void;
  busyRowId: string | null;
}

const PAGE_SIZES = [50, 100, 250];

// A group heading spans the whole table row; real rows carry the backend's cells.
type GroupRow = { id: string; group: string; isGroup: true };
type TableRow = Row | GroupRow;
const isGroup = (r: TableRow): r is GroupRow => "isGroup" in r;

function Cell({ column, row, editable, onEdit, busy }: { column: Column; row: Row; editable: boolean; onEdit: Props["onEdit"]; busy: boolean }) {
  const value = row.cells[column.key] ?? "";
  const label = `${column.label}: ${Object.values(row.cells)[0] ?? row.id}`;
  const options = row.options?.[column.key] ?? column.options ?? [];
  if (!editable || !column.editable) {
    if (column.type === "boolean") return <>{value === "true" ? "Yes" : "No"}</>;
    if (column.type === "select") return <>{options.find((o) => o.value === value)?.label ?? (value || "-")}</>;
    return <>{value || "-"}</>;
  }
  if (column.type === "boolean") {
    return <Checkbox aria-label={label} checked={value === "true"} disabled={busy} onChange={(e) => onEdit(row.id, { [column.key]: String(e.target.checked) })} />;
  }
  return (
    <Select
      aria-label={label}
      size="small"
      className="os-min-w-14"
      value={value}
      disabled={busy}
      onChange={(v: string) => onEdit(row.id, { [column.key]: v })}
      options={[{ value: "", label: "None" }, ...options.map((o) => ({ value: o.value, label: o.label }))]}
    />
  );
}

// One proposal table: searchable, paged, grouped, with the editable cells the backend allows.
export default function ProposalSection({ section, editable, onEdit, busyRowId }: Props) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return section.rows;
    return section.rows.filter((r) => Object.values(r.cells).some((v) => v.toLowerCase().includes(q)) || r.reason?.toLowerCase().includes(q));
  }, [section.rows, search]);
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const showReason = section.rows.some((r) => r.reason || r.warning);
  const span = section.columns.length + (showReason ? 1 : 0);

  // A heading row goes in wherever the group changes on this page.
  const data: TableRow[] = pageRows.flatMap((row, i) =>
    row.group && row.group !== pageRows[i - 1]?.group ? [{ id: `g-${row.group}-${i}`, group: row.group, isGroup: true as const }, row] : [row],
  );

  const columns: TableColumnsType<TableRow> = [
    ...section.columns.map((c, ci) => ({
      key: c.key,
      title: c.label,
      onCell: (r: TableRow) => (isGroup(r) ? { colSpan: ci === 0 ? span : 0 } : ({ "data-label": c.label } as React.HTMLAttributes<HTMLElement>)),
      render: (_: unknown, r: TableRow) =>
        isGroup(r) ? (ci === 0 ? <span className="os-fw-500">{r.group}</span> : null) : <Cell column={c} row={r} editable={editable} onEdit={onEdit} busy={busyRowId === r.id} />,
    })),
    ...(showReason
      ? [{
          key: "__why",
          title: "Why",
          onCell: (r: TableRow) => (isGroup(r) ? { colSpan: 0 } : ({ "data-label": "Why" } as React.HTMLAttributes<HTMLElement>)),
          render: (_: unknown, r: TableRow) =>
            isGroup(r) ? null : r.warning ? <span className="os-c-warning os-text-sm">{r.warning}</span> : <span className="os-c-secondary os-text-sm">{r.reason}</span>,
        }]
      : []),
  ];

  return (
    <Card className="os-dash-card is-flush" title={section.title} extra={<span className="os-section__meta">{section.rows.length} rows</span>}>
      {section.description && <p className="os-px-6 os-pt-4 os-m-0 os-text-sm os-c-secondary">{section.description}</p>}
      {section.rows.length > 10 && (
        <div className="os-px-6 os-pt-4">
          <FilterBar search={{ value: search, onChange: (v) => { setSearch(v); setPage(1); }, placeholder: `Search ${section.title.toLowerCase()}` }} />
        </div>
      )}
      {section.rows.length === 0 ? (
        <p className="os-px-6 os-py-4 os-m-0 os-text-sm os-c-tertiary">Nothing to show here for this run.</p>
      ) : (
        <Table<TableRow>
          className="os-grid os-table--stack os-table--no-hover"
          rowKey="id"
          columns={columns}
          dataSource={data}
          pagination={false}
          rowClassName={(r) => (isGroup(r) ? "os-proposal__group" : r.warning ? "is-warning" : "")}
          scroll={{ x: "max-content" }}
        />
      )}
      {rows.length > PAGE_SIZES[0] && (
        <div className="os-flex os-justify-end os-py-3 os-px-6 os-border-t">
          <Pagination
            current={page}
            total={rows.length}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZES}
            showSizeChanger
            size="small"
            onChange={(p, ps) => { setPage(ps !== pageSize ? 1 : p); setPageSize(ps); }}
          />
        </div>
      )}
    </Card>
  );
}
