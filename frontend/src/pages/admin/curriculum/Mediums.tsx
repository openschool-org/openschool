import { useState } from "react";
import { Add, Language } from "@carbon/icons-react";
import {
  Button,
  TextInput,
  InlineNotification,
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@carbon/react";
import { AxiosError } from "axios";
import {
  useMediums,
  useCreateMedium,
  useUpdateMedium,
  useDeleteMedium,
} from "../../../queries/useCurriculum";
import type { Medium } from "../../../services/curriculum";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ErrorMessage from "../../../components/common/ErrorMessage";
import EmptyState from "../../../components/common/EmptyState";
import ConfirmDeleteModal from "../../../components/common/ConfirmDeleteModal";

function apiError(e: unknown, fallback: string) {
  return (e as AxiosError<{ error: string }>)?.response?.data?.error ?? fallback;
}

export default function Mediums() {
  const { data: mediums, isLoading, isError, refetch } = useMediums();
  const createMedium = useCreateMedium();
  const updateMedium = useUpdateMedium();
  const deleteMedium = useDeleteMedium();

  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Medium | null>(null);
  const [name, setName] = useState("");
  const [toDelete, setToDelete] = useState<Medium | null>(null);

  const openCreate = () => {
    createMedium.reset();
    setName("");
    setEditing(null);
    setModal("create");
  };

  const openEdit = (m: Medium) => {
    updateMedium.reset();
    setName(m.name);
    setEditing(m);
    setModal("edit");
  };

  const handleSave = () => {
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
    deleteMedium.mutate(toDelete.id, { onSettled: () => setToDelete(null) });
  };

  return (
    <div className="os-page">
      <div
        className="os-page__header"
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h1 className="os-page__title">Mediums</h1>
          <p className="os-page__subtitle">
            Languages of instruction. Used to restrict a subject within a
            selection group to a single medium.
          </p>
        </div>
        <Button renderIcon={Add} kind="primary" size="md" onClick={openCreate}>
          New Medium
        </Button>
      </div>

      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">Mediums</h2>
          {mediums && (
            <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>
              {mediums.length} total
            </span>
          )}
        </div>

        {isLoading && <LoadingSpinner />}
        {isError && (
          <ErrorMessage message="Could not load mediums." onRetry={refetch} />
        )}

        {deleteMedium.isError && (
          <InlineNotification
            kind="error"
            title="Could not delete medium"
            subtitle={apiError(
              deleteMedium.error,
              "The medium may be in use by a group subject or enrollment.",
            )}
            lowContrast
            onClose={() => deleteMedium.reset()}
            style={{ maxWidth: "100%", margin: "0 1.5rem 1rem" }}
          />
        )}

        {!isLoading && !isError && mediums?.length === 0 && (
          <EmptyState
            title="No mediums"
            description="Add the languages your school teaches in, for example Sinhala, Tamil or English."
            action={
              <Button renderIcon={Add} kind="primary" onClick={openCreate}>
                New Medium
              </Button>
            }
          />
        )}

        {mediums && mediums.length > 0 && (
          <div>
            {mediums.map((m, i) => (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "1rem 1.5rem",
                  borderBottom:
                    i < mediums.length - 1 ? "1px solid #e0e0e0" : "none",
                  gap: "1rem",
                }}
              >
                <Language size={20} style={{ fill: "#406AAF", flexShrink: 0 }} />
                <span
                  style={{
                    flex: 1,
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    color: "#161616",
                  }}
                >
                  {m.name}
                </span>
                <Button kind="ghost" size="sm" onClick={() => openEdit(m)}>
                  Edit
                </Button>
                <Button
                  kind="danger--ghost"
                  size="sm"
                  onClick={() => setToDelete(m)}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ComposedModal open={!!modal} size="sm" onClose={() => setModal(null)}>
        <ModalHeader title={modal === "create" ? "New medium" : "Edit medium"} />
        <ModalBody>
          {(createMedium.isError || updateMedium.isError) && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={apiError(
                createMedium.error ?? updateMedium.error,
                "Failed to save medium",
              )}
              lowContrast
              hideCloseButton
              style={{ marginBottom: "1rem", maxWidth: "100%" }}
            />
          )}
          <TextInput
            id="medium-name"
            labelText="Name"
            placeholder="e.g. English"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={() => setModal(null)}>
            Cancel
          </Button>
          <Button
            kind="primary"
            onClick={handleSave}
            disabled={
              !name.trim() || createMedium.isPending || updateMedium.isPending
            }
          >
            {createMedium.isPending || updateMedium.isPending
              ? "Saving…"
              : "Save"}
          </Button>
        </ModalFooter>
      </ComposedModal>

      <ConfirmDeleteModal
        open={!!toDelete}
        title="Delete medium"
        description={
          <>
            Delete <strong>{toDelete?.name}</strong>? This cannot be undone.
          </>
        }
        isPending={deleteMedium.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
