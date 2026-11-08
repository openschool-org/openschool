import { useState } from "react";
import { Button, Tag } from "antd";
import SelectField from "@/shared/ui/SelectField";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import {
  useUpdateNonAcademicStaffEmploymentStatus,
  useUpdateNonAcademicStaffHouse,
  useDeleteNonAcademicStaff,
} from "@/features/staff/queries/useNonAcademicStaff";
import { useHouses } from "@/features/school/queries/useHouses";
import type { NonAcademicStaff as StaffRow, NonAcademicEmploymentStatus } from "@/features/staff/api/nonAcademicStaff";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import { EMPLOYMENT_STATUSES, designationLabel } from "@/features/staff/constants";
import StaffFormModal from "@/features/staff/components/StaffFormModal";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";

export default function StaffDetail({ staff, onDeleted }: { staff: StaffRow; onDeleted: () => void }) {
  const { data: houses } = useHouses();
  const updateStatus = useUpdateNonAcademicStaffEmploymentStatus();
  const updateHouse = useUpdateNonAcademicStaffHouse();
  const deleteStaff = useDeleteNonAcademicStaff();

  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const currentHouse = houses?.find((h) => h.id === staff.house_id);

  return (
    <div className="os-section os-mt-0">
      <div className="os-section__header">
        <h2 className="os-section__title">{staff.full_name}</h2>
        <div className="os-flex os-gap-2 os-items-center">
          <Tag variant="filled">
            {designationLabel(staff.designation)}
          </Tag>
          <Tag color="blue" variant="filled">
            {staff.employee_number}
          </Tag>
          <Button icon={<EditOutlined />} type="text" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button
            icon={<DeleteOutlined />}
            type="text"
            danger
            onClick={() => {
              deleteStaff.reset();
              setConfirmDelete(true);
            }}
          >
            Delete
          </Button>
        </div>
      </div>
      <div className="os-section__body">
        <MutationErrorNotification
          isError={deleteStaff.isError}
          error={deleteStaff.error}
          title="Could not delete staff member"
          fallback="Something went wrong."
          onClose={() => deleteStaff.reset()} className="os-mb-4"
        />

        <div className="os-grid os-grid-cols-2 os-gap-4 os-mb-6">
          <div>
            <p className="os-mt-0 os-mx-0 os-mb-h os-text-xs os-c-tertiary">Phone</p>
            <p className="os-m-0 os-text-md">{staff.phone || "-"}</p>
          </div>
          <div>
            <p className="os-mt-0 os-mx-0 os-mb-h os-text-xs os-c-tertiary">Joined</p>
            <p className="os-m-0 os-text-md">{staff.joined_date ?? "-"}</p>
          </div>
        </div>

        <div className="os-grid os-grid-cols-2 os-gap-4">
          <SelectField
            id="staff-employment-status"
            label="Employment status"
            value={staff.employment_status}
            disabled={updateStatus.isPending}
            onChange={(v) => updateStatus.mutate({
                id: staff.id,
                status: v as NonAcademicEmploymentStatus,
              })
            }
            options={EMPLOYMENT_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
          />
          <SelectField
            id="staff-house"
            label="House"
            value={staff.house_id ?? ""}
            disabled={updateHouse.isPending}
            onChange={(v) => updateHouse.mutate({ id: staff.id, houseId: v })}
            options={[{ value: "", label: "No house" }, ...(houses ?? []).map((h) => ({ value: h.id, label: h.name }))]}
          />
        </div>
        {currentHouse && (
          <div className="os-flex os-items-center os-gap-2 os-mt-3">
            <span className="os-inline-block os-w-3q os-h-3q os-rounded-full" style={{ backgroundColor: currentHouse.color }}
            />
            <span className="os-text-sm os-c-secondary">{currentHouse.name}</span>
          </div>
        )}
      </div>

      {editing && <StaffFormModal staff={staff} onClose={() => setEditing(false)} />}

      <ConfirmDeleteModal
        open={confirmDelete}
        title="Delete staff member"
        description={
          <>
            Delete <strong>{staff.full_name}</strong>? This cannot be undone.
          </>
        }
        subject="Staff member"
        mutation={deleteStaff}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => deleteStaff.mutate(staff.id)}
        onSuccess={onDeleted}
      />
    </div>
  );
}
