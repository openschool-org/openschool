import { Alert, Button, Checkbox, Spin, Tag } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import SelectField from "@/shared/ui/SelectField";
import { useEnrollmentPicker, isCompulsory } from "@/features/students/hooks/useEnrollmentPicker";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import SectionCard from "@/shared/ui/SectionCard";

const pickRule = (min: number, max: number) => (min === max ? `Pick exactly ${min}` : `Pick ${min}–${max}`);

export default function SubjectEnrollment({ studentId }: { studentId: string }) {
  const p = useEnrollmentPicker(studentId);
  const validationErrors = p.submit.data && !p.submit.data.valid ? (p.submit.data.errors ?? []) : [];

  return (
    <SectionCard title="Subject enrolment">
        {!p.academicYearId ? (
          <Alert type="info" showIcon title="No current academic year" description="Set a current academic year before assigning subjects." />
        ) : (
          <>
            <div className="os-mb-4"><Tag variant="filled">{p.currentYear?.label}</Tag></div>
            <SelectField
              id="enrollment-level"
              label="Curriculum level"
              placeholder="Select level…"
              value={p.selectedLevel}
              onChange={p.changeLevel}
              options={(p.levels ?? []).map((l) => ({ value: l.id, label: l.label }))}
            />

            {p.selectedLevel && p.treeLoading && <p className="os-mt-4 os-flex os-items-center os-gap-2"><Spin size="small" /> Loading subjects…</p>}

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
                        <Tag color={compulsory ? "blue" : undefined} variant="filled">{compulsory ? "Compulsory" : pickRule(g.min_select, g.max_select)}</Tag>
                        <span className="os-text-xs os-c-tertiary">{picks.length} selected</span>
                      </div>
                      {g.subjects.map((s) => {
                        const checked = picks.includes(s.subject_id);
                        return (
                          <div key={s.subject_id} className="os-mb-2">
                            <Checkbox
                              id={`${g.id}-${s.subject_id}`}
                              checked={checked || compulsory}
                              disabled={compulsory || (!checked && atMax)}
                              onChange={(e) => p.toggle(g.id, s.subject_id, e.target.checked)}
                            >
                              {s.medium_name ? `${s.subject_name} (${s.medium_name})` : s.subject_name}
                            </Checkbox>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

                {validationErrors.length > 0 && (
                  <Alert type="error" showIcon title="Some groups need attention" description={validationErrors.map((e) => `${e.label}: ${e.message}`).join(" · ")} className="os-mb-4" />
                )}
                <MutationErrorNotification isError={p.submit.isError} error={p.submit.error} title="Could not save enrolment" fallback="Please try again." />
                {p.submit.data?.valid && <Alert type="success" showIcon title="Saved" description="Subject enrolment updated." className="os-mb-4" />}

                <Button type="primary" icon={<SaveOutlined />} onClick={p.save} loading={p.submit.isPending}>
                  {p.submit.isPending ? "Saving…" : "Save enrolment"}
                </Button>
              </div>
            )}
          </>
        )}
    </SectionCard>
  );
}
