import { useT } from "@/shared/i18n/useT";

interface Props {
  label?: string;
}

export default function LoadingSpinner({ label }: Props) {
  const { t } = useT();
  return (
    <div className="os-brand-loader" role="status" aria-live="polite">
      <div className="os-brand-loader__mark">
        <img src="/favicon.webp" alt="" width={48} height={48} />
      </div>
      <p className="os-brand-loader__label">{label ?? t("common.loading")}</p>
    </div>
  );
}
