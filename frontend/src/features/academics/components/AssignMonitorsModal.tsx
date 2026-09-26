import type { useAssignMonitors } from "@/features/academics/queries/useClasses";
import type { Student } from "@/features/students/api/student";
import FormModal from "@/shared/ui/FormModal";
import EntityCombobox from "@/shared/ui/EntityCombobox";

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
      <div className="os-grid os-gap-4">
        <EntityCombobox
          id="girl-monitor-choice"
          labelText="Girl monitor"
          items={girlMonitorCandidates}
          selectedId={girlMonitorChoice}
          onSelect={onGirlMonitorChoiceChange}
          getId={(s) => s.id}
          itemToString={(s) => `${s.full_name} - ${s.index_number}`}
          placeholder="Search students by name or index number…"
        />
        <EntityCombobox
          id="boy-monitor-choice"
          labelText="Boy monitor"
          items={boyMonitorCandidates}
          selectedId={boyMonitorChoice}
          onSelect={onBoyMonitorChoiceChange}
          getId={(s) => s.id}
          itemToString={(s) => `${s.full_name} - ${s.index_number}`}
          placeholder="Search students by name or index number…"
        />
      </div>
    </FormModal>
  );
}
