import { useState } from "react";
import { Alert, Button, Input } from "antd";
import { SaveOutlined, SearchOutlined } from "@ant-design/icons";
import DataGrid from "@/shared/ui/DataGrid";
import SelectField from "@/shared/ui/SelectField";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import EmptyState from "@/shared/ui/EmptyState";
import AgentFindingsBanner from "@/features/notifications/components/AgentFindingsBanner";
import EntityCombobox from "@/shared/ui/EntityCombobox";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import SectionHeader from "@/shared/ui/SectionHeader";
import { useClassMarksEntry } from "@/features/marks/hooks/useClassMarksEntry";
import { classMarksColumns } from "@/features/marks/components/classMarksColumns";

type Entry = ReturnType<typeof useClassMarksEntry>;

export default function ClassMarks({ classId, academicYearId }: { classId: string; academicYearId: string }) {
  const entry = useClassMarksEntry(classId, academicYearId);

  return (
    <div>
      <AgentFindingsBanner />
      <div className="os-section">
        <SectionHeader
          title="Term marks"
          className="os-wrap os-gap-3"
          meta={
            <div className="os-flex os-gap-3 os-wrap">
              <SelectField
                id="marks-term"
                label="Term"
                hideLabel
                placeholder="Choose a term…"
                className="os-min-w-12"
                value={entry.termId}
                onChange={entry.pickTerm}
                options={entry.terms.map((t) => ({ value: t.id, label: t.is_current ? `${t.name} (current)` : t.name }))}
              />
              <div className="os-min-w-12">
                <EntityCombobox
                  id="marks-subject"
                  items={entry.classSubjects}
                  selectedId={entry.subjectId}
                  onSelect={entry.setSubjectId}
                  getId={(s) => s.id}
                  itemToString={(s) => s.name}
                  placeholder="Choose a subject…"
                />
              </div>
            </div>
          }
        />
        <ClassMarksBody entry={entry} />
      </div>
    </div>
  );
}

function ClassMarksBody({ entry }: { entry: Entry }) {
  const { saveMarks, rows } = entry;
  const [search, setSearch] = useState("");
  const words = search.trim().toLowerCase();
  const shown = (rows ?? []).filter((r) => !words || `${r.student_name} ${r.index_number}`.toLowerCase().includes(words));
  if (!entry.termId || !entry.subjectId) {
    return <EmptyState title="Pick a term and subject" description="Choose which term test and subject you're recording marks for." />;
  }
  if (entry.isLoading) return <LoadingSpinner />;
  if (!rows || rows.length === 0) {
    return <EmptyState title="No students enrolled" description="Enrol students into this class before recording marks." />;
  }
  return (
    <>
      <MutationErrorNotification
        isError={saveMarks.isError}
        error={saveMarks.error}
        title="Could not save marks"
        fallback="Please try again."
        onClose={() => saveMarks.reset()} className="os-mt-0 os-mx-6 os-mb-4"
      />
      {saveMarks.isSuccess && (
        <Alert type="success" showIcon closable onClose={() => saveMarks.reset()} className="os-mt-0 os-mx-6 os-mb-4" title="Marks saved" />
      )}
      <div className="os-py-3h os-px-6 os-border-b">
        <Input
          className="os-max-w-px-280"
          allowClear
          prefix={<SearchOutlined />}
          aria-label="Search students"
          placeholder="Search student by name or index…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {shown.length === 0 ? (
        <p className="os-m-0 os-py-6 os-px-6 os-c-tertiary">No students match "{search}".</p>
      ) : (
        <DataGrid rows={shown} columns={classMarksColumns(entry.draft, entry.update)} getRowId={(r) => r.student_id} pagination={false} noHover />
      )}
      <div className="os-py-4 os-px-6 os-border-t">
        <Button type="primary" icon={<SaveOutlined />} onClick={entry.save} loading={saveMarks.isPending}>
          {saveMarks.isPending ? "Saving…" : "Save marks"}
        </Button>
      </div>
    </>
  );
}
