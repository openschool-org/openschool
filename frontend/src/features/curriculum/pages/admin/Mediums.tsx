import { useState } from "react";
import { Button } from "antd";
import { GlobalOutlined, PlusOutlined } from "@ant-design/icons";
import FormModal from "@/shared/ui/FormModal";
import TextField from "@/shared/ui/TextField";
import {
  useMediums,
  useCreateMedium,
  useUpdateMedium,
  useDeleteMedium,
} from "@/features/curriculum/queries/useCurriculum";
import type { Medium } from "@/features/curriculum/api/curriculum";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import EmptyState from "@/shared/ui/EmptyState";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import SectionHeader from "@/shared/ui/SectionHeader";
import ListRowSkeleton from "@/shared/ui/ListRowSkeleton";
import InfoTip from "@/shared/ui/InfoTip";

export default function Mediums() {
  const { data: mediums, isLoading, isError, refetch } = useMediums();
  const createMedium = useCreateMedium();
  const updateMedium = useUpdateMedium();
  const deleteMedium = useDeleteMedium();

  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Medium | null>(null);
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [toDelete, setToDelete] = useState<Medium | null>(null);

  const openCreate = () => {
    createMedium.reset();
    setName("");
    setNameTouched(false);
    setEditing(null);
    setModal("create");
  };

  const openEdit = (m: Medium) => {
    updateMedium.reset();
    setName(m.name);
    setNameTouched(false);
    setEditing(m);
    setModal("edit");
  };

  const handleSave = () => {
    setNameTouched(true);
    if (!name.trim()) return;
    const data = { name: name.trim() };
    if (modal === "create") {
      createMedium.mutate(data, { onSuccess: () => setModal(null) });
    } else if (editing) {
      updateMedium.mutate(
        { id: editing.id, data },
        { onSuccess: () => setModal(null) },
      );
    }
  };

  const handleDelete = () => {
    if (!toDelete) return;
    deleteMedium.mutate(toDelete.id);
  };

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Mediums</h1>
          <div className="os-page__subtitle os-page__subtitle--tip">
            Languages subjects are taught in.
            <InfoTip>Use these to limit a subject in a selection group to one language.</InfoTip>
          </div>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          New medium
        </Button>
      </div>

      <div className="os-section">
        <SectionHeader
          title="Mediums"
          meta={mediums && <span className="os-section__meta">{mediums.length} total</span>}
        />

        {isLoading && (
          <div>
            {Array.from({ length: 3 }).map((_, i) => (
              <ListRowSkeleton key={i} leadingWidth="1.5rem" titleWidth="30%" subtitleWidth={null} trailingWidth={null} />
            ))}
          </div>
        )}
        {isError && (
          <ErrorMessage message="Could not load mediums." onRetry={refetch} />
        )}

        <MutationErrorNotification
          isError={deleteMedium.isError}
          error={deleteMedium.error}
          title="Could not delete medium"
          fallback="The medium may be in use by a group subject or enrolment."
          onClose={() => deleteMedium.reset()} className="os-mt-0 os-mx-6 os-mb-4"
        />

        {!isLoading && !isError && mediums?.length === 0 && (
          <EmptyState
            title="No mediums"
            description="Add the languages your school teaches in, for example Sinhala, Tamil or English."
            action={
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                New medium
              </Button>
            }
          />
        )}

        {!isLoading && mediums && mediums.length > 0 && (
          <div>
            {mediums.map((m) => (
              <div key={m.id} className="os-list-row">
                <GlobalOutlined className="os-c-accent os-shrink-0 os-text-lg" />
                <span className="os-flex-1 os-fw-600 os-text-md os-c-primary">
                  {m.name}
                </span>
                <Button type="text" size="small" onClick={() => openEdit(m)}>
                  Edit
                </Button>
                <Button type="text" danger size="small" onClick={() => setToDelete(m)}>
                  Delete
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <FormModal
        open={!!modal}
        title={modal === "create" ? "New medium" : "Edit medium"}
        onClose={() => setModal(null)}
        onSubmit={handleSave}
        isPending={createMedium.isPending || updateMedium.isPending}
        submitDisabled={!name.trim()}
        isError={createMedium.isError || updateMedium.isError}
        error={createMedium.error ?? updateMedium.error}
        errorTitle="Could not save medium"
        errorFallback="Please try again."
      >
        <TextField
          id="medium-name"
          label="Name"
          placeholder="e.g. English"
          value={name}
          onChange={setName}
          onBlur={() => setNameTouched(true)}
          invalid={nameTouched && !name.trim()}
          invalidText="Medium name is required."
        />
      </FormModal>

      <ConfirmDeleteModal
        open={!!toDelete}
        title="Delete medium"
        description={
          <>
            Delete <strong>{toDelete?.name}</strong>? This cannot be undone.
          </>
        }
        subject="Medium"
        mutation={deleteMedium}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
