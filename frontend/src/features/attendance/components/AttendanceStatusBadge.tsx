import { useT } from "@/shared/i18n/useT";
import { translateValue } from "@/shared/i18n/translateValue";

// Solid status pill with white text for read-only attendance views.
export default function AttendanceStatusBadge({ status }: { status: string }) {
  const { t } = useT();
  return <span className={`os-att-badge is-${status}`}>{translateValue(t, "status", status)}</span>;
}
