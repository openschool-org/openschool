import { Link } from "react-router";
import { SkeletonText } from "@carbon/react";
import { ACCENT } from "../constants";

export default function StatCard({
  label,
  value,
  loading,
  Icon,
  path,
}: {
  label: string;
  value: number;
  loading: boolean;
  Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  path: string;
}) {
  return (
    <Link to={path} style={{ textDecoration: "none" }}>
      <div className="os-stat-card" style={{ cursor: "pointer" }}>
        <p className="os-stat-card__label">
          <Icon size={14} style={{ fill: ACCENT }} />
          {label}
        </p>
        {loading ? <SkeletonText width="40%" heading /> : <p className="os-stat-card__value">{value}</p>}
      </div>
    </Link>
  );
}
