import { useMemo, useState } from "react";
import { Search, Add, Edit, TrashCan } from "@carbon/icons-react";
import {
  Tag,
  SkeletonText,
  Button,
  TextInput,
  Select,
  SelectItem,
  RadioButtonGroup,
  RadioButton,
  InlineNotification,
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  DatePicker,
  DatePickerInput,
} from "@carbon/react";
import {
  useNonAcademicStaffList,
  useCreateNonAcademicStaff,
  useUpdateNonAcademicStaff,
  useUpdateNonAcademicStaffEmploymentStatus,
  useUpdateNonAcademicStaffHouse,
  useDeleteNonAcademicStaff,
} from "../../../queries/useNonAcademicStaff";
import { useHouses } from "../../../queries/useHouses";
import { NON_ACADEMIC_DESIGNATIONS } from "../../../services/nonAcademicStaff";
import type {
  NonAcademicStaff as StaffRow,
  NonAcademicDesignation,
  NonAcademicEmploymentStatus,
} from "../../../services/nonAcademicStaff";
import { getErrorMessage } from "../../../lib/errorMessage";
import EmptyState from "../../../components/common/EmptyState";
import ErrorMessage from "../../../components/common/ErrorMessage";
import ConfirmDeleteModal from "../../../components/common/ConfirmDeleteModal";
import { todayISODate, toYmd } from "../../../lib/date";

const EMPLOYMENT_STATUSES: { value: NonAcademicEmploymentStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "resigned", label: "Resigned" },
  { value: "transferred", label: "Transferred" },
];

function designationLabel(value: string) {
  return NON_ACADEMIC_DESIGNATIONS.find((d) => d.value === value)?.label ?? value;
}

function StaffFormModal({
  staff,
  onClose,
}: {
  staff: StaffRow | null;
  onClose: () => void;
}) {
  const isEdit = !!staff;
  const createStaff = useCreateNonAcademicStaff();
  const updateStaff = useUpdateNonAcademicStaff();
  const pending = createStaff.isPending || updateStaff.isPending;
  const error = createStaff.error ?? updateStaff.error;

  const [form, setForm] = useState({
    full_name: staff?.full_name ?? "",
    designation: (staff?.designation ?? "") as NonAcademicDesignation | "",
    phone: staff?.phone ?? "",
    gender: (staff?.gender ?? "") as "" | "male" | "female",
    joined_date: staff?.joined_date ?? todayISODate(),
  });
  const [touched, setTouched] = useState<{ full_name?: boolean; designation?: boolean }>({});

  const isValid = form.full_name.trim().length > 0 && !!form.designation;

  const handleSave = () => {
    setTouched({ full_name: true, designation: true });
    if (!isValid) return;

    if (isEdit && staff) {
      updateStaff.mutate(
        {
          id: staff.id,
          data: {
            full_name: form.full_name.trim(),
            designation: form.designation as NonAcademicDesignation,
            phone: form.phone.trim() || undefined,
            gender: form.gender || undefined,
          },
        },
        { onSuccess: onClose },
      );
    } else {
      createStaff.mutate(
        {
          full_name: form.full_name.trim(),
          designation: form.designation as NonAcademicDesignation,
          phone: form.phone.trim() || undefined,
          gender: form.gender || undefined,
          joined_date: new Date(form.joined_date).toISOString(),
        },
        { onSuccess: onClose },
      );
    }
  };

  return (
    <ComposedModal open size="sm" onClose={onClose}>
      <ModalHeader title={isEdit ? "Edit staff member" : "Add staff member"} />
      <ModalBody>
        {error && (
          <InlineNotification
            kind="error"
            title="Error"
            subtitle={getErrorMessage(error, "Failed to save staff member")}
            lowContrast
            hideCloseButton
            style={{ marginBottom: "1rem", maxWidth: "100%" }}
          />
        )}
        <div style={{ display: "grid", gap: "1rem" }}>
          <TextInput
            id="staff-name"
            labelText="Full Name"
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            onBlur={() => setTouched((t) => ({ ...t, full_name: true }))}
            invalid={!!touched.full_name && !form.full_name.trim()}
            invalidText="A name is required."
          />
          <Select
            id="staff-designation"
            labelText="Designation"
            value={form.designation}
            onChange={(e) =>
              setForm((f) => ({ ...f, designation: e.target.value as NonAcademicDesignation }))
            }
            invalid={!!touched.designation && !form.designation}
            invalidText="Select a designation."
          >
            <SelectItem value="" text="Select…" />
            {NON_ACADEMIC_DESIGNATIONS.map((d) => (
              <SelectItem key={d.value} value={d.value} text={d.label} />
            ))}
          </Select>
          <RadioButtonGroup
            legendText="Gender (optional)"
            name="staff-gender"
            valueSelected={form.gender}
            onChange={(value) => setForm((f) => ({ ...f, gender: value as "male" | "female" }))}
          >
            <RadioButton id="staff-gender-male" labelText="Male" value="male" />
            <RadioButton id="staff-gender-female" labelText="Female" value="female" />
          </RadioButtonGroup>
          <TextInput
            id="staff-phone"
            labelText="Phone (optional)"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          {!isEdit && (
            <DatePicker
              datePickerType="single"
              dateFormat="Y-m-d"
              value={form.joined_date}
              onChange={(dates) => {
                const ymd = toYmd(dates[0]);
                if (ymd) {
                  setForm((f) => ({ ...f, joined_date: ymd }));
                }
              }}
            >
              <DatePickerInput id="staff-joined-date" labelText="Joining Date" placeholder="YYYY-MM-DD" />
            </DatePicker>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button kind="primary" onClick={handleSave} disabled={!isValid || pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
}

function StaffDetail({ staff, onDeleted }: { staff: StaffRow; onDeleted: () => void }) {
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

export default function NonAcademicStaff() {
  const [search, setSearch] = useState("");
  const [designation, setDesignation] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: staff, isLoading, isError, refetch } = useNonAcademicStaffList(search, designation);

  const ordered = useMemo(() => {
    if (!staff) return [];
    return [...staff].sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [staff]);

  const selected = ordered.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Non-Academic Staff</h1>
          <p className="os-page__subtitle">
            Lab assistants, librarians, office staff, and other staff without
            a portal login.
          </p>
        </div>
        <Button renderIcon={Add} kind="primary" size="md" onClick={() => setCreating(true)}>
          Add Staff
        </Button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <div className="os-search" style={{ maxWidth: "24rem" }}>
          <Search size={16} className="os-search__icon" />
          <input
            className="os-search__input"
            placeholder="Search staff…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          id="staff-designation-filter"
          labelText="Designation"
          hideLabel
          value={designation}
          onChange={(e) => setDesignation(e.target.value)}
          style={{ maxWidth: "16rem" }}
        >
          <SelectItem value="" text="All designations" />
          {NON_ACADEMIC_DESIGNATIONS.map((d) => (
            <SelectItem key={d.value} value={d.value} text={d.label} />
          ))}
        </Select>
      </div>

      {isError && <ErrorMessage message="Could not load staff." onRetry={refetch} />}

      <div style={{ display: "grid", gridTemplateColumns: "20rem 1fr", gap: "1.5rem", alignItems: "start" }}>
        <div className="os-section" style={{ marginTop: 0 }}>
          {isLoading && (
            <div>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ padding: "0.875rem 1.5rem", borderBottom: "1px solid #e0e0e0" }}>
                  <SkeletonText width="70%" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && !isError && ordered.length === 0 && (
            <EmptyState
              title="No staff yet"
              description="Add lab assistants, librarians, office staff, and other non-academic staff."
            />
          )}

          {!isLoading &&
            ordered.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "0.875rem 1.5rem",
                  border: "none",
                  borderBottom: i < ordered.length - 1 ? "1px solid #e0e0e0" : "none",
                  background: selected?.id === s.id ? "#edf5ff" : "transparent",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#161616" }}>{s.full_name}</div>
                <div style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>
                  {designationLabel(s.designation)} · {s.employee_number}
                </div>
              </button>
            ))}
        </div>

        {selected ? (
          <StaffDetail staff={selected} onDeleted={() => setSelectedId(null)} />
        ) : (
          <div className="os-section" style={{ marginTop: 0 }}>
            <EmptyState title="Select a staff member" description="Pick a staff member from the list to see their details." />
          </div>
        )}
      </div>

      {creating && <StaffFormModal staff={null} onClose={() => setCreating(false)} />}
    </div>
  );
}
