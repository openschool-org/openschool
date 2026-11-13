import { useMemo, useState } from "react";
import { Alert, Button, Tag, Tooltip } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined, UsergroupAddOutlined } from "@ant-design/icons";
import DataGrid from "@/shared/ui/DataGrid";
import TableSkeleton from "@/shared/ui/TableSkeleton";
import { useHouses, useCreateHouse, useUpdateHouse, useDeleteHouse, useReassignMissingHouses, useReassignMissingStaffHouses } from "@/features/school/queries/useHouses";
import type { House } from "@/features/school/api/house";
import { HOUSE_COLOR_PALETTE } from "@/features/school/setupConstants";
import HouseFormModal, { type HouseForm } from "@/features/school/components/HouseFormModal";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import EmptyState from "@/shared/ui/EmptyState";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";

const EMPTY_FORM: HouseForm = { name: "", code: "", color: HOUSE_COLOR_PALETTE[0] };

export default function HousesPanel() {
  const { data: houses, isLoading, isError, refetch } = useHouses();
  const createHouse = useCreateHouse();
  const updateHouse = useUpdateHouse();
  const deleteHouse = useDeleteHouse();
  const reassign = useReassignMissingHouses();
  const reassignStaff = useReassignMissingStaffHouses();

  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<House | null>(null);
  const [form, setForm] = useState<HouseForm>(EMPTY_FORM);
  const [nameTouched, setNameTouched] = useState(false);
  const [toDelete, setToDelete] = useState<House | null>(null);

  const ordered = useMemo(() => [...(houses ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [houses]);
  const saving = modal === "edit" ? updateHouse : createHouse;

  const openCreate = () => {
    createHouse.reset();
    setForm(EMPTY_FORM);
    setEditing(null);
    setNameTouched(false);
    setModal("create");
  };

  const openEdit = (h: House) => {
    updateHouse.reset();
    setForm({ name: h.name, code: h.code ?? "", color: h.color || HOUSE_COLOR_PALETTE[0] });
    setEditing(h);
    setNameTouched(false);
    setModal("edit");
  };

  const save = () => {
    setNameTouched(true);
    if (!form.name.trim()) return;
    const data = { name: form.name.trim(), code: form.code.trim() || undefined, color: form.color };
    const close = { onSuccess: () => setModal(null) };
    if (modal === "create") createHouse.mutate(data, close);
    else if (editing) updateHouse.mutate({ id: editing.id, data }, close);
  };

  const resetReassign = () => { reassign.reset(); reassignStaff.reset(); };

  return (
    <div className="os-stack os-gap-4">
      {isError && <ErrorMessage message="Could not load houses." onRetry={refetch} />}
      <MutationErrorNotification isError={deleteHouse.isError} error={deleteHouse.error} title="Could not delete house" fallback="The house may be assigned to a student or teacher." onClose={() => deleteHouse.reset()} />
      {(reassign.isSuccess || reassignStaff.isSuccess) && (
        <Alert
          type="success"
          showIcon
          closable
          title="Houses assigned"
          description={[reassign.data && `${reassign.data.assigned} student(s)`, reassignStaff.data && `${reassignStaff.data.assigned} staff member(s)`].filter(Boolean).join(" and ") + " assigned a house."}
          onClose={resetReassign}
        />
      )}
      <MutationErrorNotification isError={reassign.isError || reassignStaff.isError} error={reassign.error ?? reassignStaff.error} title="Could not re-assign" fallback="Please try again." onClose={resetReassign} />

      <div className="os-section">
        <div className="os-section__header os-tt-head">
          <div>
            <h2 className="os-section__title">Houses {houses && <span className="os-c-tertiary os-fw-400">· {houses.length}</span>}</h2>
            <p className="os-text-sm os-c-secondary os-m-0">New students and staff join the house with the fewest members.</p>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add house</Button>
        </div>

        {isLoading ? (
          <TableSkeleton headers={["House", "Code", ""]} />
        ) : !isError && ordered.length === 0 ? (
          <EmptyState
            title="No houses yet"
            description="Add the houses this school uses. Students and staff are then spread across them automatically."
            action={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add house</Button>}
          />
        ) : (
          <DataGrid
            rows={ordered}
            getRowId={(h) => h.id}
            noHover
            pagination={false}
            columns={[
              { key: "name", header: "House", render: (h) => <span className="os-flex os-items-center os-gap-3"><span aria-hidden className="os-house-swatch" style={{ background: h.color }} /><span className="os-fw-500">{h.name}</span></span> },
              { key: "code", header: "Code", render: (h) => (h.code ? <Tag variant="filled">{h.code}</Tag> : <span className="os-table__muted">-</span>) },
              {
                key: "actions",
                header: "",
                align: "end",
                render: (h) => (
                  <div className="os-grid__actions">
                    <Tooltip title={`Edit ${h.name}`}><Button type="text" size="small" aria-label={`Edit ${h.name}`} icon={<EditOutlined />} onClick={() => openEdit(h)} /></Tooltip>
                    <Tooltip title={`Delete ${h.name}`}><Button type="text" size="small" danger aria-label={`Delete ${h.name}`} icon={<DeleteOutlined />} onClick={() => setToDelete(h)} /></Tooltip>
                  </div>
                ),
              },
            ]}
          />
        )}

        {ordered.length > 0 && (
          <div className="os-house-footer">
            <p className="os-m-0 os-text-sm os-c-secondary">People added before houses existed can be given one now.</p>
            <div className="os-flex os-gap-2 os-wrap">
              <Button icon={<UsergroupAddOutlined />} loading={reassign.isPending} onClick={() => reassign.mutate()}>Assign students</Button>
              <Button icon={<UsergroupAddOutlined />} loading={reassignStaff.isPending} onClick={() => reassignStaff.mutate()}>Assign staff</Button>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <HouseFormModal
          mode={modal}
          form={form}
          onChange={setForm}
          nameTouched={nameTouched}
          onNameBlur={() => setNameTouched(true)}
          isPending={saving.isPending}
          isError={saving.isError}
          error={saving.error}
          onClose={() => setModal(null)}
          onSubmit={save}
        />
      )}

      <ConfirmDeleteModal
        open={!!toDelete}
        title="Delete house"
        description={<>Delete <strong>{toDelete?.name}</strong>? This is blocked while a student or teacher is assigned to it.</>}
        subject="House"
        mutation={deleteHouse}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteHouse.mutate(toDelete.id)}
      />
    </div>
  );
}
