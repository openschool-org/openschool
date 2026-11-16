import type { ComponentType, ReactNode } from "react";
import { Link } from "react-router";
import { Card, Skeleton } from "antd";
import { useT } from "@/shared/i18n/useT";

interface Props {
  label: string;
  value: ReactNode;
  loading: boolean;
  Icon: ComponentType<{ className?: string }>;
  // Omit for a card that is not a link.
  path?: string;
  meta?: ReactNode;
  // Shows "-" instead of a misleading 0 when the numbers could not load.
  error?: boolean;
}

export default function StatCard({ label, value, loading, Icon, path, meta, error }: Props) {
  const { t } = useT();
  const card = (
    <Card className="os-dash-stat">
      <p className="os-dash-stat__label"><Icon />{label}</p>
      {loading ? (
        <Skeleton.Input size="small" />
      ) : (
        <>
          <p className="os-dash-stat__value">{error ? "-" : value}</p>
          {(error || meta) && <p className="os-dash-stat__meta">{error ? t("common.loadFailed") : meta}</p>}
        </>
      )}
    </Card>
  );
  return path ? <Link to={path} className="os-no-underline">{card}</Link> : card;
}
