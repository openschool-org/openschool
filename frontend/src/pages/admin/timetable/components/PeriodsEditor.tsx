import { useState } from "react";
import { Button, TextInput, InlineNotification, ComposedModal, ModalHeader, ModalBody, ModalFooter, SkeletonText } from "@carbon/react";
import {
  useGradeSectionPeriods,
  useSaveGradeSectionPeriods,
  useRegenerateGradeSectionPeriods,
} from "../../../../queries/timetable/useGradeSections";
import type { GradeSection, TimetablePeriod } from "../../../../services/timetable/gradeSection";
import { getErrorMessage } from "../../../../lib/errorMessage";
import EmptyState from "../../../../components/common/EmptyState";

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
    <ComposedModal open size="md" onClose={onClose}>
      <ModalHeader title={`${section.name} — period grid`} />
      <ModalBody>
        {save.isError && (
          <InlineNotification
            kind="error"
            title="Could not save periods"
            subtitle={getErrorMessage(save.error)}
            lowContrast
            style={{ marginBottom: "1rem", maxWidth: "100%" }}
          />
        )}
        {regenerate.isError && (
          <InlineNotification
            kind="error"
            title="Could not regenerate periods"
            subtitle={getErrorMessage(regenerate.error)}
            lowContrast
            style={{ marginBottom: "1rem", maxWidth: "100%" }}
          />
        )}
        <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "flex-end" }}>
          <Button
            kind="ghost"
            size="sm"
            onClick={() => regenerate.mutate(undefined, { onSuccess: () => setRows(null) })}
            disabled={busy}
          >
            {regenerate.isPending ? "Regenerating…" : "Regenerate from Timetable Settings"}
          </Button>
        </div>
        {isLoading ? (
          <SkeletonText width="60%" />
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
                <tr key={i} style={p.slot_type === "interval" ? { background: "#fff8e1" } : undefined}>
                  <td>{p.slot_type === "interval" ? "Interval" : "Period"}</td>
                  <td>{p.period_number ?? "-"}</td>
                  <td>
                    <TextInput
                      id={`start-${i}`}
                      labelText=""
                      type="time"
                      size="sm"
                      value={formatTimeForInput(p.start_time)}
                      disabled={busy}
                      onChange={(e) => updateRow(i, { start_time: e.target.value })}
                    />
                  </td>
                  <td>
                    <TextInput
                      id={`end-${i}`}
                      labelText=""
                      type="time"
                      size="sm"
                      value={formatTimeForInput(p.end_time)}
                      disabled={busy}
                      onChange={(e) => updateRow(i, { end_time: e.target.value })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          Close
        </Button>
        <Button kind="primary" onClick={handleSave} disabled={!rows || busy}>
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
}
