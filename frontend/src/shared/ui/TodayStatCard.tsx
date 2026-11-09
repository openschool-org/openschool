import { Link } from "react-router";
import { SkeletonText } from "@/shared/ui/Skeleton";
import type { ComponentType, ReactNode } from "react";

interface Props {
  label: string;
  value: ReactNode;
  meta?: string;
  loading?: boolean;
  Icon: ComponentType<{ className?: string }>;
  path: string;
}

export default function TodayStatCard({ label, value, meta, loading, Icon, path }: Props) {
  return (
    <Link to={path} className="os-no-underline">
      <div className="os-stat-card os-pointer">
        <p className="os-stat-card__label">
          <Icon />
          {label}
        </p>
        {loading ? <SkeletonText width="40%" heading /> : <p className="os-stat-card__value">{value}</p>}
        {meta && !loading && <p className="os-stat-card__meta">{meta}</p>}
      </div>
    </Link>
  );
}
