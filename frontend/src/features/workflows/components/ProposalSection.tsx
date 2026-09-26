import { Fragment, useMemo, useState } from "react";
import { Checkbox, Pagination, Select, SelectItem } from "@carbon/react";
import type { Column, Row, Section } from "@/features/workflows/api/workflows";
import FilterBar from "@/shared/ui/FilterBar";

interface Props {
  section: Section;
  editable: boolean;
  onEdit: (rowId: string, cells: Record<string, string>) => void;
  busyRowId: string | null;
}

const PAGE_SIZES = [50, 100, 250];

function Cell({ column, row, editable, onEdit, busy }: { column: Column; row: Row; editable: boolean; onEdit: Props["onEdit"]; busy: boolean }) {
  const value = row.cells[column.key] ?? "";
  const label = `${column.label}: ${Object.values(row.cells)[0] ?? row.id}`;
  if (!editable || !column.editable) {
    if (column.type === "boolean") return <>{value === "true" ? "Yes" : "No"}</>;
    if (column.type === "select") {
      const options = row.options?.[column.key] ?? column.options ?? [];
      return <>{options.find((o) => o.value === value)?.label ?? (value || "-")}</>;
    }
    return <>{value || "-"}</>;
  }
  if (column.type === "boolean") {
    return <Checkbox id={`cell-${row.id}-${column.key}`} labelText={label} hideLabel checked={value === "true"} disabled={busy} onChange={(_, { checked }) => onEdit(row.id, { [column.key]: String(checked) })} />;
  }
  const options = row.options?.[column.key] ?? column.options ?? [];
  return (
    <Select id={`cell-${row.id}-${column.key}`} labelText={label} hideLabel size="sm" value={value} disabled={busy} onChange={(e) => onEdit(row.id, { [column.key]: e.target.value })}>
      <SelectItem value="" text="None" />
      {options.map((o) => <SelectItem key={o.value} value={o.value} text={o.label} />)}
    </Select>
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

  return (
    <div className="os-section">
      <div className="os-section__header">
        <h2 className="os-section__title">{section.title}</h2>
        <span className="os-section__meta">{section.rows.length} rows</span>
      </div>
      {section.description && <p className="os-px-6 os-pt-3 os-m-0 os-text-sm os-c-secondary">{section.description}</p>}
      {section.rows.length > 10 && (
        <div className="os-px-6 os-pt-3">
          <FilterBar search={{ value: search, onChange: (v) => { setSearch(v); setPage(1); }, placeholder: `Search ${section.title.toLowerCase()}` }} />
        </div>
      )}
      {section.rows.length === 0 && <p className="os-px-6 os-py-4 os-m-0 os-text-sm os-c-tertiary">Nothing to show here for this run.</p>}
      {section.rows.length > 0 && <div className="os-table-scroll">
        <table className="os-table os-table--stack os-table--no-hover">
          <thead>
            <tr>
              {section.columns.map((c) => <th key={c.key}>{c.label}</th>)}
              {showReason && <th>Why</th>}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <Fragment key={row.id}>
                {row.group && row.group !== pageRows[i - 1]?.group && (
                  <tr key={`g-${row.group}`} className="os-proposal__group"><td colSpan={section.columns.length + (showReason ? 1 : 0)}>{row.group}</td></tr>
                )}
                <tr className={row.warning ? "is-warning" : undefined}>
                  {section.columns.map((c) => (
                    <td key={c.key} data-label={c.label}>
                      <Cell column={c} row={row} editable={editable} onEdit={onEdit} busy={busyRowId === row.id} />
                    </td>
                  ))}
                  {showReason && (
                    <td data-label="Why" className="os-text-sm">
                      {row.warning ? <span className="os-c-warning">{row.warning}</span> : <span className="os-c-secondary">{row.reason}</span>}
                    </td>
                  )}
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>}
      {rows.length > PAGE_SIZES[0] && (
        <Pagination totalItems={rows.length} page={page} pageSize={pageSize} pageSizes={PAGE_SIZES} onChange={({ page: p, pageSize: ps }) => { setPage(p); setPageSize(ps); }} />
      )}
    </div>
  );
}
