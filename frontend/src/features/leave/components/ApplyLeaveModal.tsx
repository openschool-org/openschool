import { useState } from "react";
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
import SelectField from "@/shared/ui/SelectField";
import TextAreaField from "@/shared/ui/TextAreaField";
import TextField from "@/shared/ui/TextField";

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
        showToast({ kind: "success", title: "Leave applied", subtitle: "The Principal and Vice Principals have been notified and will review your request." });
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
        <SelectField id="leave-type" label="Type of leave" helperText={typeHelp} value={values.leaveType} onChange={(v) => set("leaveType", v as LeaveType)} options={LEAVE_TYPES.map((t) => ({ value: t.value, label: t.label }))} />

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
          <SelectField id="leave-day-part" label="Part of the day" value={values.dayPart} onChange={(v) => set("dayPart", v as DayPart)} options={DAY_PARTS.map((p) => ({ value: p.value, label: p.label }))} />
        )}

        {isShort && (
          <div className="os-grid os-grid-cols-2 os-gap-4">
            <TextField id="leave-start-time" label="Leaving at" type="time" value={values.startTime} onChange={(v) => set("startTime", v)} invalid={touched && !!errors.startTime} invalidText={errors.startTime} />
            <TextField id="leave-end-time" label="Back at" type="time" value={values.endTime} onChange={(v) => set("endTime", v)} invalid={touched && !!errors.endTime} invalidText={errors.endTime} />
          </div>
        )}

        <TextAreaField id="leave-reason" label="Reason" rows={2} maxLength={1000} value={values.reason} onChange={(v) => set("reason", v)} invalid={touched && !!errors.reason} invalidText={errors.reason} />

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
          <h3 className="os-text-md os-fw-500 os-mb-2">Relief for your periods</h3>
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
