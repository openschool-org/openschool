import { useState } from "react";
import { Tag, Select, SelectItem, InlineNotification, Button } from "@carbon/react";
import { Edit, TrashCan } from "@carbon/icons-react";
import {
  useUpdateNonAcademicStaffEmploymentStatus,
  useUpdateNonAcademicStaffHouse,
  useDeleteNonAcademicStaff,
} from "../../../../queries/useNonAcademicStaff";
import { useHouses } from "../../../../queries/useHouses";
import type { NonAcademicStaff as StaffRow, NonAcademicEmploymentStatus } from "../../../../services/nonAcademicStaff";
import { getErrorMessage } from "../../../../lib/errorMessage";
import ConfirmDeleteModal from "../../../../components/common/ConfirmDeleteModal";
import { EMPLOYMENT_STATUSES, designationLabel } from "../constants";
import StaffFormModal from "./StaffFormModal";

export default function StaffDetail({ staff, onDeleted }: { staff: StaffRow; onDeleted: () => void }) {
  const { data: houses } = useHouses();
  const updateStatus = useUpdateNonAcademicStaffEmploymentStatus();
  const updateHouse = useUpdateNonAcademicStaffHouse();
  const deleteStaff = useDeleteNonAcademicStaff();

  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const currentHouse = houses?.find((h) => h.id === staff.house_id);

  return (
    <div className="os-section" style={{ marginTop: 0 }}>
      <div className="os-section__header">
        <h2 className="os-section__title">{staff.full_name}</h2>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <Tag size="sm" type="gray">
            {designationLabel(staff.designation)}
          </Tag>
          <Tag size="sm" type="blue">
            {staff.employee_number}
          </Tag>
          <Button renderIcon={Edit} kind="ghost" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button
            renderIcon={TrashCan}
            kind="danger--ghost"
            size="sm"
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
        {deleteStaff.isError && (
          <InlineNotification
            kind="error"
            title="Could not delete staff member"
            subtitle={getErrorMessage(deleteStaff.error, "Something went wrong.")}
            lowContrast
            onClose={() => deleteStaff.reset()}
            style={{ marginBottom: "1rem", maxWidth: "100%" }}
          />
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <p style={{ margin: "0 0 0.15rem", fontSize: "0.75rem", color: "#8d8d8d" }}>Phone</p>
            <p style={{ margin: 0, fontSize: "0.875rem" }}>{staff.phone || "—"}</p>
          </div>
          <div>
            <p style={{ margin: "0 0 0.15rem", fontSize: "0.75rem", color: "#8d8d8d" }}>Joined</p>
            <p style={{ margin: 0, fontSize: "0.875rem" }}>{staff.joined_date ?? "—"}</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <Select
            id="staff-employment-status"
            labelText="Employment Status"
            value={staff.employment_status}
            disabled={updateStatus.isPending}
            onChange={(e) =>
              updateStatus.mutate({
                id: staff.id,
                status: e.target.value as NonAcademicEmploymentStatus,
              })
            }
          >
            {EMPLOYMENT_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value} text={s.label} />
            ))}
          </Select>
          <Select
            id="staff-house"
            labelText="House"
            value={staff.house_id ?? ""}
            disabled={updateHouse.isPending}
            onChange={(e) => updateHouse.mutate({ id: staff.id, houseId: e.target.value })}
          >
            <SelectItem value="" text="No house" />
            {houses?.map((h) => (
              <SelectItem key={h.id} value={h.id} text={h.name} />
            ))}
          </Select>
        </div>
        {currentHouse && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.75rem" }}>
            <span
              style={{
                display: "inline-block",
                width: "0.75rem",
                height: "0.75rem",
                borderRadius: "50%",
                backgroundColor: currentHouse.color,
              }}
            />
            <span style={{ fontSize: "0.8125rem", color: "#525252" }}>{currentHouse.name}</span>
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
        isPending={deleteStaff.isPending}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() =>
          deleteStaff.mutate(staff.id, {
            onSuccess: () => {
              setConfirmDelete(false);
              onDeleted();
            },
          })
        }
      />
    </div>
  );
}
