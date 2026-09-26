import { useMemo } from "react";
import { useMyChildren, useChildrenSummary } from "@/features/parent/queries/useParent";
import ChildCard from "@/features/parent/components/ChildCard";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import EmptyState from "@/shared/ui/EmptyState";
import { useT } from "@/shared/i18n/useT";

export default function ParentDashboard() {
  const { t } = useT();
  const { data: children, isLoading, isError, refetch } = useMyChildren();
  const { data: summaries, isLoading: summaryLoading } = useChildrenSummary();
  const summaryById = useMemo(() => new Map((summaries ?? []).map((s) => [s.student_id, s])), [summaries]);

  if (isLoading) return <LoadingSpinner />;
  if (isError) {
    return (
      <div className="os-p-8">
        <ErrorMessage message={t("parent.loadFailed")} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">{t("parent.title")}</h1>
          <p className="os-page__subtitle">{t("parent.subtitle")}</p>
        </div>
      </div>

      {children && children.length === 0 && <EmptyState title={t("parent.emptyTitle")} description={t("parent.emptyDesc")} />}

      {children && children.length > 0 && (
        <div className="os-quick-grid">
          {children.map((c) => (
            <ChildCard key={c.id} child={c} summary={summaryById.get(c.id)} summaryLoading={summaryLoading} />
          ))}
        </div>
      )}
    </div>
  );
}
