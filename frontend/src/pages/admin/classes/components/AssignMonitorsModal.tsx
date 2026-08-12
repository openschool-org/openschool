import type { useAssignMonitors } from "../../../../queries/useClasses";
import type { Student } from "../../../../services/student";
import FormModal from "../../../../components/common/FormModal";
import EntityCombobox from "../../../../components/common/EntityCombobox";

interface Props {
  open: boolean;
  girlMonitorCandidates: Student[];
  boyMonitorCandidates: Student[];
  girlMonitorChoice: string;
  onGirlMonitorChoiceChange: (id: string) => void;
  boyMonitorChoice: string;
  onBoyMonitorChoiceChange: (id: string) => void;
  assignMonitors: ReturnType<typeof useAssignMonitors>;
  onClose: () => void;
  onSave: () => void;
}

export default function AssignMonitorsModal({
  open,
  girlMonitorCandidates,
  boyMonitorCandidates,
  girlMonitorChoice,
  onGirlMonitorChoiceChange,
  boyMonitorChoice,
  onBoyMonitorChoiceChange,
  assignMonitors,
  onClose,
  onSave,
}: Props) {
  return (
    <FormModal
      open={open}
      title="Assign class monitors"
      onClose={onClose}
      onSubmit={onSave}
      isPending={assignMonitors.isPending}
      isError={assignMonitors.isError}
      error={assignMonitors.error}
      errorFallback="Failed to assign monitors"
    >
      <div style={{ display: "grid", gap: "1rem" }}>
        <EntityCombobox
          id="girl-monitor-choice"
          labelText="Girl Monitor"
          items={girlMonitorCandidates}
          selectedId={girlMonitorChoice}
          onSelect={onGirlMonitorChoiceChange}
          getId={(s) => s.id}
          itemToString={(s) => `${s.full_name} — ${s.index_number}`}
          placeholder="Search students by name or index number…"
        />
        <EntityCombobox
          id="boy-monitor-choice"
          labelText="Boy Monitor"
          items={boyMonitorCandidates}
          selectedId={boyMonitorChoice}
          onSelect={onBoyMonitorChoiceChange}
          getId={(s) => s.id}
          itemToString={(s) => `${s.full_name} — ${s.index_number}`}
          placeholder="Search students by name or index number…"
        />
      </div>
    </FormModal>
  );
}
