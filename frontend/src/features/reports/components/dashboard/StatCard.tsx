import { Link } from "react-router";
import { Card, Skeleton } from "antd";

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
  Icon: React.ComponentType<{ className?: string }>;
  path: string;
}) {
  return (
    <Link to={path} className="os-no-underline">
      <Card className="os-dash-stat">
        <p className="os-dash-stat__label"><Icon />{label}</p>
        {loading ? <Skeleton.Input size="small" /> : <p className="os-dash-stat__value">{value}</p>}
      </Card>
    </Link>
  );
}
