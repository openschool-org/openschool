import { useState } from "react";
import { Select, SelectItem, TextArea, TextInput } from "@carbon/react";
import FormModal from "@/shared/ui/FormModal";
import DateField from "@/shared/ui/DateField";
import EntityCombobox from "@/shared/ui/EntityCombobox";
import { useToast } from "@/shared/ui/toast/useToast";
import { useTeachers } from "@/features/teachers/queries/useTeachers";
import { displayName } from "@/shared/lib/name";
import type { DayPart, LeaveType } from "@/features/leave/api/leave";
import { DAY_PARTS, HALF_DAY_TYPES, LEAVE_TYPES } from "@/features/leave/constants";
import { useLeaveForm } from "@/features/leave/hooks/useLeaveForm";
import { useApplyLeave } from "@/features/leave/queries/useLeave";
import ReliefPeriodsTable from "@/features/leave/components/ReliefPeriodsTable";

interface Props {
  open: boolean;
  onClose: () => void;
}

// The leave application: what leave, when, why, and who covers the classes.
export default function ApplyLeaveModal({ open, onClose }: Props) {
  const form = useLeaveForm();
  const apply = useApplyLeave();
  const { showToast } = useToast();
  const [touched, setTouched] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState("");
  const { data: teachers } = useTeachers({ status: "active", search: teacherSearch || undefined, limit: 50 });
  const { values, set, isShort, singleDay, errors } = form;
  // A half day is offered once the leave is a single date of a type that allows it.
  const canHalfDay = HALF_DAY_TYPES.includes(values.leaveType) && (values.dayPart !== "full" || values.startDate === values.endDate);
  const typeHelp = LEAVE_TYPES.find((t) => t.value === values.leaveType)?.help;

  const close = () => {
    form.reset();
    setTouched(false);
    apply.reset();
    onClose();
  };

  const submit = () => {
    setTouched(true);
    if (!form.isValid) return;
    apply.mutate(form.toRequest(), {
      onSuccess: () => {
        showToast({ kind: "success", title: "Leave applied", subtitle: "The Principal has been told and will approve it." });
        close();
      },
    });
  };

  return (
    <FormModal
      open={open}
      title="Apply for leave"
      size="lg"
      onClose={close}
      onSubmit={submit}
      submitLabel="Apply"
      pendingLabel="Applying…"
      isPending={apply.isPending}
      isError={apply.isError}
      error={apply.error}
      errorTitle="Could not apply for leave"
    >
      <div className="os-flex os-col os-gap-5">
        <Select id="leave-type" labelText="Type of leave" helperText={typeHelp} value={values.leaveType} onChange={(e) => set("leaveType", e.target.value as LeaveType)}>
          {LEAVE_TYPES.map((t) => <SelectItem key={t.value} value={t.value} text={t.label} />)}
        </Select>

        <div className="os-grid os-grid-cols-2 os-gap-4">
          <DateField id="leave-start" labelText={singleDay ? "Date" : "First day"} value={values.startDate} onChange={(v) => set("startDate", v)} />
          {!singleDay && (
            <DateField
              id="leave-end"
              labelText="Last day"
              value={values.endDate}
              minDate={values.startDate}
              onChange={(v) => set("endDate", v)}
              invalid={touched && !!errors.endDate}
              invalidText={errors.endDate}
            />
          )}
        </div>

        {canHalfDay && (
          <Select id="leave-day-part" labelText="Part of the day" value={values.dayPart} onChange={(e) => set("dayPart", e.target.value as DayPart)}>
            {DAY_PARTS.map((p) => <SelectItem key={p.value} value={p.value} text={p.label} />)}
          </Select>
        )}

        {isShort && (
          <div className="os-grid os-grid-cols-2 os-gap-4">
            <TextInput id="leave-start-time" labelText="Leaving at" type="time" value={values.startTime} onChange={(e) => set("startTime", e.target.value)} invalid={touched && !!errors.startTime} invalidText={errors.startTime} />
            <TextInput id="leave-end-time" labelText="Back at" type="time" value={values.endTime} onChange={(e) => set("endTime", e.target.value)} invalid={touched && !!errors.endTime} invalidText={errors.endTime} />
          </div>
        )}

        <TextArea id="leave-reason" labelText="Reason" rows={2} maxCount={1000} value={values.reason} onChange={(e) => set("reason", e.target.value)} invalid={touched && !!errors.reason} invalidText={errors.reason} />

        <EntityCombobox
          id="leave-acting-teacher"
          labelText="Acting teacher (optional)"
          placeholder="Who looks after your class duties"
          items={teachers?.items ?? []}
          selectedId={values.actingTeacherId}
          onSelect={(id) => set("actingTeacherId", id)}
          getId={(t) => t.id}
          itemToString={(t) => displayName(t)}
          onSearch={setTeacherSearch}
        />

        <div>
          <h3 className="os-text-md os-fw-600 os-mb-2">Relief for your periods</h3>
          <ReliefPeriodsTable
            periods={form.periods.data?.items ?? []}
            truncated={!!form.periods.data?.truncated}
            isLoading={form.periods.isLoading && form.periods.fetchStatus !== "idle"}
            relief={form.relief}
            onPick={form.setRelief}
          />
        </div>
      </div>
    </FormModal>
  );
}
