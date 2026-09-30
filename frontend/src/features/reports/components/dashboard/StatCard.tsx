import { Link } from "react-router";
import { SkeletonText } from "@carbon/react";

export default function StatCard({
  label,
  value,
  loading,
  Icon,
  path,
}: {
  label: string;
  value: number | string;
  loading: boolean;
  Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  path: string;
}) {
  return (
    <Link to={path} className="os-no-underline">
      <div className="os-stat-card os-pointer">
        <p className="os-stat-card__label">
          <Icon size={14} />
          {label}
        </p>
        {loading ? <SkeletonText width="40%" heading /> : <p className="os-stat-card__value">{value}</p>}
      </div>
    </Link>
  );
}
