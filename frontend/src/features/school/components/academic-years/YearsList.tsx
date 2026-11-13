import { Button, Tag } from "antd";
import { CheckOutlined } from "@ant-design/icons";
import type { useAcademicYears, useSetCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import type { AcademicYear } from "@/features/school/api/academicYear";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import EmptyState from "@/shared/ui/EmptyState";
import SectionHeader from "@/shared/ui/SectionHeader";
import TableSkeleton from "@/shared/ui/TableSkeleton";
import DataGrid from "@/shared/ui/DataGrid";
import { formatMonth } from "@/shared/lib/date";

interface Props {
  years: ReturnType<typeof useAcademicYears>["data"];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  setCurrent: ReturnType<typeof useSetCurrentAcademicYear>;
  onOpenTerms: (year: AcademicYear) => void;
  onRequestDelete: (year: AcademicYear) => void;
}

export default function YearsList({ years, isLoading, isError, refetch, setCurrent, onOpenTerms, onRequestDelete }: Props) {
  return (
    <div className="os-section">
      <SectionHeader title="Academic years" meta={years && <span className="os-section__meta">{years.length} total</span>} />

      {isLoading ? (
        <TableSkeleton headers={["Year", "Period", "Status", ""]} />
      ) : isError ? (
        <ErrorMessage message="Could not load academic years." onRetry={refetch} />
      ) : !years?.length ? (
        <EmptyState title="No academic years" description="Create the first academic year to get started." />
      ) : (
        <DataGrid
          rows={years}
          getRowId={(y) => y.id}
          noHover
          pagination={false}
          rowClassName={(y) => (y.is_current ? "os-row--current" : "")}
          columns={[
            { key: "label", header: "Year", render: (y) => <span className="os-fw-500">{y.label}</span> },
            { key: "period", header: "Period", render: (y) => <span className="os-table__muted os-nowrap">{formatMonth(y.start_date)} – {formatMonth(y.end_date)}</span> },
            {
              key: "status",
              header: "Status",
              render: (y) => (y.is_current ? <Tag color="cyan" variant="filled" icon={<CheckOutlined />}>Current</Tag> : <Tag variant="filled">Closed</Tag>),
            },
            {
              key: "actions",
              header: "",
              align: "end",
              render: (y) => (
                <div className="os-grid__actions os-nowrap-flex">
                  <Button size="small" onClick={() => onOpenTerms(y)}>Terms</Button>
                  {!y.is_current && (
                    <>
                      <Button size="small" type="text" loading={setCurrent.isPending && setCurrent.variables === y.id} onClick={() => setCurrent.mutate(y.id)}>Set current</Button>
                      <Button size="small" type="text" danger onClick={() => onRequestDelete(y)}>Delete</Button>
                    </>
                  )}
                </div>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
