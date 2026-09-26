import { useMemo, useState } from "react";
import { Add } from "@carbon/icons-react";
import { Button, Tag, InlineNotification, SkeletonText } from "@carbon/react";
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
    <div>
      <div className="os-page__header os-flex os-items-start os-justify-between">
        <div>
          <h2 className="os-section__title os-m-0">Houses</h2>
          <p className="os-page__subtitle os-mt-1">
            New students and staff are assigned automatically to whichever house currently has the fewest members, with random tie-breaks.
          </p>
        </div>
        <Button renderIcon={Add} kind="primary" size="md" onClick={openCreate}>Add house</Button>
      </div>

      {isError && <ErrorMessage message="Could not load houses." onRetry={refetch} />}
      <MutationErrorNotification isError={deleteHouse.isError} error={deleteHouse.error} title="Could not delete house" fallback="The house may be assigned to a student or teacher." onClose={() => deleteHouse.reset()} />
      {(reassign.isSuccess || reassignStaff.isSuccess) && (
        <InlineNotification
          kind="success"
          title="Houses assigned"
          subtitle={[reassign.data && `${reassign.data.assigned} student(s)`, reassignStaff.data && `${reassignStaff.data.assigned} staff member(s)`].filter(Boolean).join(" and ") + " assigned a house."}
          lowContrast
          onClose={resetReassign}
          className="os-max-w-full os-mb-4"
        />
      )}
      <MutationErrorNotification isError={reassign.isError || reassignStaff.isError} error={reassign.error ?? reassignStaff.error} title="Could not re-assign" fallback="Please try again." onClose={resetReassign} />

      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">Houses</h2>
          {houses && <span className="os-text-xs os-c-tertiary">{houses.length} total</span>}
        </div>

        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="os-flex os-items-center os-py-3h os-px-6 os-border-b os-gap-4">
              <SkeletonText width="1.5rem" />
              <SkeletonText width="30%" />
            </div>
          ))}

        {!isLoading && !isError && ordered.length === 0 && (
          <EmptyState
            title="No houses yet"
            description="Add the houses this school uses. Students and staff are then assigned automatically, balanced across whichever houses exist."
            action={<Button renderIcon={Add} kind="primary" onClick={openCreate}>Add house</Button>}
          />
        )}

        {ordered.map((h) => (
          <div key={h.id} className="os-list-item os-flex os-items-center os-gap-4">
            <span aria-hidden className="os-dot os-w-1r os-h-1r" style={{ backgroundColor: h.color }} />
            <span className="os-fw-600 os-text-md os-c-primary">{h.name}</span>
            {h.code && <Tag type="cool-gray" size="sm">{h.code}</Tag>}
            <div className="os-flex-1" />
            <Button kind="ghost" size="sm" onClick={() => openEdit(h)}>Edit</Button>
            <Button kind="danger--ghost" size="sm" onClick={() => setToDelete(h)}>Delete</Button>
          </div>
        ))}
      </div>

      {ordered.length > 0 && (
        <div className="os-flex os-items-center os-gap-3 os-wrap">
          <Button kind="tertiary" size="md" disabled={reassign.isPending} onClick={() => reassign.mutate()}>
            {reassign.isPending ? "Assigning…" : "Re-assign students without a house"}
          </Button>
          <Button kind="tertiary" size="md" disabled={reassignStaff.isPending} onClick={() => reassignStaff.mutate()}>
            {reassignStaff.isPending ? "Assigning…" : "Re-assign staff without a house"}
          </Button>
          <span className="os-text-xs os-c-tertiary">Useful after setting up houses. People added earlier get one too.</span>
        </div>
      )}

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
