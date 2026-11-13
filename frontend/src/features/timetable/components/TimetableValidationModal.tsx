import { Alert, Button, Modal, Skeleton } from "antd";
import { MODAL_WIDTH } from "@/shared/ui/modalWidth";
import type { ValidationResult } from "@/features/timetable/api/timetable";
import { WEEKDAYS } from "@/shared/lib/timetable";

interface Props {
  open: boolean;
  validating: boolean;
  validation: ValidationResult | undefined;
  onClose: () => void;
}

export default function TimetableValidationModal({ open, validating, validation, onClose }: Props) {
  return (
    <Modal open={open} title="Validation results" width={MODAL_WIDTH.md} onCancel={onClose} footer={<Button onClick={onClose}>Close</Button>}>
      {validating ? (
        <Skeleton active title={false} paragraph={{ rows: 3 }} />
      ) : !validation || validation.issues.length === 0 ? (
        <Alert type="success" showIcon title="No issues found" description="This timetable is ready to submit." />
      ) : (
        <div className="os-stack os-gap-2">
          {validation.issues.map((issue, i) => (
            <Alert
              key={i}
              type={issue.severity === "error" ? "error" : "warning"}
              showIcon
              title={
                <>
                  {issue.day_of_week != null && <strong>{WEEKDAYS.find((d) => d.value === issue.day_of_week)?.label} P{issue.period_number}: </strong>}
                  {issue.message}
                </>
              }
            />
          ))}
        </div>
      )}
    </Modal>
  );
}
