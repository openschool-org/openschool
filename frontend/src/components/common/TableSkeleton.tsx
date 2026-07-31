import { SkeletonText } from "@carbon/react";

interface TableSkeletonProps {
  headers: string[];
  rows?: number;
}

export default function TableSkeleton({ headers, rows = 6 }: TableSkeletonProps) {
  return (
    <table className="os-table">
      <thead>
        <tr>
          {headers.map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, r) => (
          <tr key={r}>
            {headers.map((_, c) => (
              <td key={c}>
                <SkeletonText width={`${55 + ((r + c) % 4) * 10}%`} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
