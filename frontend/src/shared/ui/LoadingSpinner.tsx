import { InlineLoading } from "@carbon/react";
import { useT } from "@/shared/i18n/useT";

export default function LoadingSpinner() {
  const { t } = useT();
  return (
    <div className="os-flex os-items-center os-justify-center os-p-12">
      <InlineLoading description={t("common.loading")} status="active" />
    </div>
  );
}
