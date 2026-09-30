import { useState } from "react";
import { Select, SelectItem } from "@carbon/react";
import { useStudents } from "@/features/students/queries/useStudents";
import { useAssignPrefect } from "@/features/portfolio/queries/usePrefects";
import type { PrefectRank } from "@/features/portfolio/api/prefect";
import FormModal from "@/shared/ui/FormModal";
import EntityCombobox from "@/shared/ui/EntityCombobox";
import { PREFECT_RANKS } from "@/features/portfolio/constants";
import { displayName } from "@/shared/lib/name";

interface Props {
  academicYearId: string;
  assignedStudentIds: Set<string>;
  onClose: () => void;
}

export default function AppointPrefectModal({ academicYearId, assignedStudentIds, onClose }: Props) {
  const [search, setSearch] = useState("");
  const { data: studentPage } = useStudents({ limit: 25, search });
  const assign = useAssignPrefect();
  const [studentId, setStudentId] = useState("");
  const [rank, setRank] = useState<PrefectRank>("junior");
  const available = (studentPage?.items ?? []).filter((s) => !assignedStudentIds.has(s.id));

  return (
    <FormModal
      open
      title="Appoint prefect"
      onClose={onClose}
      onSubmit={() => studentId && assign.mutate({ academic_year_id: academicYearId, student_id: studentId, rank }, { onSuccess: onClose })}
      isPending={assign.isPending}
      submitLabel="Appoint"
      submitDisabled={!studentId}
      isError={assign.isError}
      error={assign.error}
      errorFallback="Failed to appoint prefect"
    >
      <div className="os-grid os-gap-4">
        <EntityCombobox id="prefect-student" labelText="Student" items={available} selectedId={studentId} onSelect={setStudentId} onSearch={setSearch} getId={(s) => s.id} itemToString={(s) => `${displayName(s)} - ${s.index_number}`} placeholder="Search students by name or index number…" />
        <Select id="prefect-rank" labelText="Rank" value={rank} onChange={(e) => setRank(e.target.value as PrefectRank)}>
          {PREFECT_RANKS.map((r) => <SelectItem key={r.value} value={r.value} text={r.label.replace(/s$/, "")} />)}
        </Select>
      </div>
    </FormModal>
  );
}
