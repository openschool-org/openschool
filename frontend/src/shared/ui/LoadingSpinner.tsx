import { Spin } from "antd";
import { useT } from "@/shared/i18n/useT";

interface Props {
  label?: string;
}

// Centred antd spinner with a visible label, for whole pages and panels that are loading.
export default function LoadingSpinner({ label }: Props) {
  const { t } = useT();
  return (
    <div className="os-loading" role="status" aria-live="polite">
      <Spin size="large" />
      <p className="os-loading__label">{label ?? t("common.loading")}</p>
    </div>
  );
}
