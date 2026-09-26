import { Button, Select, SelectItem, Checkbox, Tag, InlineNotification, InlineLoading } from "@carbon/react";
import { Save } from "@carbon/icons-react";
import { useEnrollmentPicker, isCompulsory } from "@/features/students/hooks/useEnrollmentPicker";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";

const pickRule = (min: number, max: number) => (min === max ? `Pick exactly ${min}` : `Pick ${min}–${max}`);

export default function SubjectEnrollment({ studentId }: { studentId: string }) {
  const p = useEnrollmentPicker(studentId);
  const validationErrors = p.submit.data && !p.submit.data.valid ? (p.submit.data.errors ?? []) : [];

  return (
    <div className="os-section">
      <div className="os-section__header">
        <h2 className="os-section__title">Subject enrolment</h2>
      </div>
      <div className="os-section__body">
        {!p.academicYearId ? (
          <InlineNotification kind="info" title="No current academic year" subtitle="Set a current academic year before assigning subjects." lowContrast hideCloseButton className="os-max-w-full" />
        ) : (
          <>
            <div className="os-mb-4"><Tag type="cool-gray" size="sm">{p.currentYear?.label}</Tag></div>
            <Select id="enrollment-level" labelText="Curriculum level" value={p.selectedLevel} onChange={(e) => p.changeLevel(e.target.value)}>
              <SelectItem value="" text="Select level…" />
              {p.levels?.map((l) => <SelectItem key={l.id} value={l.id} text={l.label} />)}
            </Select>

            {p.selectedLevel && p.treeLoading && <InlineLoading description="Loading subjects…" />}

            {p.selectedLevel && p.tree && (
              <div className="os-mt-5">
                {p.tree.groups.map((g) => {
                  const picks = p.selected[g.id] ?? [];
                  const compulsory = isCompulsory(g);
                  const atMax = picks.length >= g.max_select;
                  return (
                    <div key={g.id} className="os-mb-6">
                      <div className="os-flex os-items-center os-gap-2 os-mb-2">
                        <strong>{g.label}</strong>
                        <Tag type={compulsory ? "blue" : "gray"} size="sm">{compulsory ? "Compulsory" : pickRule(g.min_select, g.max_select)}</Tag>
                        <span className="os-text-xs os-c-tertiary">{picks.length} selected</span>
                      </div>
                      {g.subjects.map((s) => {
                        const checked = picks.includes(s.subject_id);
                        return (
                          <Checkbox
                            key={s.subject_id}
                            id={`${g.id}-${s.subject_id}`}
                            labelText={s.medium_name ? `${s.subject_name} (${s.medium_name})` : s.subject_name}
                            checked={checked || compulsory}
                            disabled={compulsory || (!checked && atMax)}
                            onChange={(_e, { checked: c }) => p.toggle(g.id, s.subject_id, c)}
                          />
                        );
                      })}
                    </div>
                  );
                })}

                {validationErrors.length > 0 && (
                  <InlineNotification kind="error" title="Some groups need attention" subtitle={validationErrors.map((e) => `${e.label}: ${e.message}`).join(" · ")} lowContrast hideCloseButton className="os-mb-4 os-max-w-full" />
                )}
                <MutationErrorNotification isError={p.submit.isError} error={p.submit.error} title="Could not save enrolment" fallback="Please try again." />
                {p.submit.data?.valid && <InlineNotification kind="success" title="Saved" subtitle="Subject enrolment updated." lowContrast hideCloseButton className="os-mb-4 os-max-w-full" />}

                <Button renderIcon={Save} kind="primary" size="sm" onClick={p.save} disabled={p.submit.isPending}>
                  {p.submit.isPending ? "Saving…" : "Save enrolment"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
