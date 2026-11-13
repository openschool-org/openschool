import { useState } from "react";
import { Button, Modal, Skeleton } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import {
  useGradeSectionPeriods,
  useSaveGradeSectionPeriods,
  useRegenerateGradeSectionPeriods,
} from "@/features/timetable/queries/useGradeSections";
import type { GradeSection, TimetablePeriod } from "@/features/timetable/api/gradeSection";
import EmptyState from "@/shared/ui/EmptyState";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import TextField from "@/shared/ui/TextField";
import { MODAL_WIDTH } from "@/shared/ui/modalWidth";

const formatTimeForInput = (t: string) => {
  if (!t) return "";
  return t.slice(0, 5);
};

export default function PeriodsEditor({ section, onClose }: { section: GradeSection; onClose: () => void }) {
  const { data: periods, isLoading } = useGradeSectionPeriods(section.id);
  const save = useSaveGradeSectionPeriods(section.id);
  const regenerate = useRegenerateGradeSectionPeriods(section.id);
  const [rows, setRows] = useState<Omit<TimetablePeriod, "id">[] | null>(null);

  const active = rows ?? periods ?? [];

  const updateRow = (index: number, patch: Partial<TimetablePeriod>) => {
    const next = [...active];
    next[index] = { ...next[index], ...patch };
    setRows(next);
  };

  const handleSave = () => {
    if (!rows) return;
    save.mutate(rows, { onSuccess: () => setRows(null) });
  };

  const busy = save.isPending || regenerate.isPending;

  return (
    <Modal
      open
      title={`${section.name} - period grid`}
      width={MODAL_WIDTH.md}
      onCancel={onClose}
      footer={
        <>
          <Button onClick={onClose}>Close</Button>
          <Button type="primary" onClick={handleSave} disabled={!rows || regenerate.isPending} loading={save.isPending}>
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        </>
      }
    >
        <MutationErrorNotification
          isError={save.isError}
          error={save.error}
          title="Could not save periods" className="os-mb-4"
        />
        <MutationErrorNotification
          isError={regenerate.isError}
          error={regenerate.error}
          title="Could not regenerate periods" className="os-mb-4"
        />
        <div className="os-mb-4 os-flex os-justify-end">
          <Button
            size="small"
            icon={<ReloadOutlined />}
            loading={regenerate.isPending}
            onClick={() => regenerate.mutate(undefined, { onSuccess: () => setRows(null) })}
            disabled={busy}
          >
            {regenerate.isPending ? "Regenerating…" : "Regenerate from Timetable Settings"}
          </Button>
        </div>
        {isLoading ? (
          <Skeleton active title={false} paragraph={{ rows: 4 }} />
        ) : active.length === 0 ? (
          <EmptyState
            title="No periods configured"
            description="Configure Timetable Settings for this academic year, then regenerate."
          />
        ) : (
          <table className="os-table">
            <thead>
              <tr>
                <th>Slot</th>
                <th>Period #</th>
                <th>Start</th>
                <th>End</th>
              </tr>
            </thead>
            <tbody>
              {active.map((p, i) => (
                <tr key={i} className={p.slot_type === "interval" ? "os-period-row--interval" : undefined}>
                  <td>{p.slot_type === "interval" ? "Interval" : "Period"}</td>
                  <td>{p.period_number ?? "-"}</td>
                  <td>
                    <TextField
                      id={`start-${i}`}
                      label={`${p.slot_type === "interval" ? "Interval" : "Period"} ${i + 1} start time`}
                      hideLabel
                      type="time"
                      size="small"
                      value={formatTimeForInput(p.start_time)}
                      disabled={busy}
                      onChange={(v) => updateRow(i, { start_time: v })}
                    />
                  </td>
                  <td>
                    <TextField
                      id={`end-${i}`}
                      label={`${p.slot_type === "interval" ? "Interval" : "Period"} ${i + 1} end time`}
                      hideLabel
                      type="time"
                      size="small"
                      value={formatTimeForInput(p.end_time)}
                      disabled={busy}
                      onChange={(v) => updateRow(i, { end_time: v })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </Modal>
  );
}
