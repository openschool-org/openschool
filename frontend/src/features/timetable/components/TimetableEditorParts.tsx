import { Button, Tag } from "antd";
import { ArrowLeftOutlined, CheckCircleOutlined } from "@ant-design/icons";
import type { Timetable, StatusHistoryEntry } from "@/features/timetable/api/timetable";
import type { usePublishTimetable, useSubmitTimetable } from "@/features/timetable/queries/useTimetables";
import { TIMETABLE_STATUS_TAG } from "@/shared/lib/constants/tags";
import { formatDateTime } from "@/shared/lib/date";

const statusLabel = (s: string) => TIMETABLE_STATUS_TAG[s as keyof typeof TIMETABLE_STATUS_TAG]?.label ?? s;

interface HeaderProps {
  title: string;
  timetable: Timetable;
  validating: boolean;
  onBack: () => void;
  onValidate: () => void;
  submit: ReturnType<typeof useSubmitTimetable>;
  publish: ReturnType<typeof usePublishTimetable>;
}

// Class name, status, version and the validate / submit / publish actions.
export function TimetableEditorHeader({ title, timetable, validating, onBack, onValidate, submit, publish }: HeaderProps) {
  return (
    <div className="os-page__header">
      <div className="os-page__header-left">
        <h1 className="os-page__title">{title}</h1>
        <div className="os-flex os-items-center os-gap-2 os-wrap os-mt-1">
          <Tag color={TIMETABLE_STATUS_TAG[timetable.status as keyof typeof TIMETABLE_STATUS_TAG]?.color} variant="filled">{statusLabel(timetable.status)}</Tag>
          <Tag variant="filled">v{timetable.version}</Tag>
          {timetable.review_comments && <span className="os-text-sm os-c-secondary">Reviewer: <em>{timetable.review_comments}</em></span>}
        </div>
      </div>
      <div className="os-flex os-gap-2">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={onBack}>Back</Button>
        <Button icon={<CheckCircleOutlined />} onClick={onValidate} loading={validating}>
          {validating ? "Validating…" : "Validate"}
        </Button>
        {timetable.status === "draft" && (
          <Button type="primary" onClick={() => submit.mutate()} loading={submit.isPending}>
            {submit.isPending ? "Submitting…" : "Submit for review"}
          </Button>
        )}
        {timetable.status === "approved" && (
          <Button type="primary" onClick={() => publish.mutate()} loading={publish.isPending}>
            {publish.isPending ? "Publishing…" : "Publish"}
          </Button>
        )}
      </div>
    </div>
  );
}

export function TimetableStatusHistory({ history }: { history: StatusHistoryEntry[] | undefined }) {
  if (!history?.length) return null;
  return (
    <div className="os-section os-py-4 os-px-6">
      <h2 className="os-section__title os-mb-3">Status history</h2>
      {history.map((h) => (
        <div key={h.id} className="os-text-sm os-c-secondary os-mb-1h">
          <strong>{statusLabel(h.to_status)}</strong> by {h.changed_by_name} on {formatDateTime(h.changed_at)}
          {h.comment && <> - {h.comment}</>}
        </div>
      ))}
    </div>
  );
}
