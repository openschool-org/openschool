import type { ReactNode } from "react";
import { Button, Card, Skeleton } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import DataGrid, { type GridColumn } from "@/shared/ui/DataGrid";
import EmptyState from "@/shared/ui/EmptyState";
import ErrorMessage from "@/shared/ui/ErrorMessage";

interface Props<T> {
  title: string;
  // Shown under the title, e.g. what belongs in this list.
  subtitle?: string;
  // When set, an "Add …" button sits in the card header; the form itself lives in a modal.
  addLabel?: string;
  onAdd?: () => void;
  isLoading: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  rows: T[];
  columns: GridColumn<T>[];
  getRowId: (row: T) => string;
  empty: { title: string; description: string };
  // Extra content above the table, such as an error from the last add.
  children?: ReactNode;
}

// One list of records on a detail page (awards, activities, reports …): header with an Add button, then a table.
export default function RecordsCard<T>({ title, subtitle, addLabel, onAdd, isLoading, isError, errorMessage, onRetry, rows, columns, getRowId, empty, children }: Props<T>) {
  return (
    <Card
      className="os-dash-card is-flush os-records-card"
      title={
        <span className="os-records-card__title">
          {title}
          {subtitle && <span className="os-records-card__subtitle">{subtitle}</span>}
        </span>
      }
      extra={addLabel && onAdd && <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>{addLabel}</Button>}
    >
      {children && <div className="os-records-card__notice">{children}</div>}
      {isLoading ? (
        <div className="os-p-6"><Skeleton active title={false} paragraph={{ rows: 3 }} /></div>
      ) : isError ? (
        <div className="os-p-6"><ErrorMessage message={errorMessage ?? "Could not load these records."} onRetry={onRetry} /></div>
      ) : rows.length === 0 ? (
        <EmptyState title={empty.title} description={empty.description} />
      ) : (
        <DataGrid rows={rows} columns={columns} getRowId={getRowId} pageSize={10} pageSizes={[10, 25, 50]} noHover />
      )}
    </Card>
  );
}
