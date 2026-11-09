import { Table } from "antd";
import { SkeletonText } from "@/shared/ui/Skeleton";

interface TableSkeletonProps {
  headers: string[];
  rows?: number;
}

// Loading state for a DataGrid: the same antd Table and header, with shimmer lines for cells.
export default function TableSkeleton({ headers, rows = 6 }: TableSkeletonProps) {
  const columns = headers.map((h, c) => ({
    key: `${c}`,
    title: h,
    render: (_: unknown, row: { r: number }) => <SkeletonText width={`${55 + ((row.r + c) % 4) * 10}%`} className="os-m-0" />,
  }));
  return (
    <div className="os-table-container" role="status" aria-label="Loading table">
      <Table
        className="os-grid os-table--no-hover"
        columns={columns}
        dataSource={Array.from({ length: rows }, (_, r) => ({ r }))}
        rowKey="r"
        pagination={false}
      />
    </div>
  );
}
