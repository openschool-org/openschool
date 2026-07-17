import { useState } from "react";
import { Link } from "react-router";
import { Add, ChevronRight, Copy, Layers } from "@carbon/icons-react";
import {
  Button,
  Tag,
  TextInput,
  NumberInput,
  Select,
  SelectItem,
  InlineNotification,
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@carbon/react";
import { AxiosError } from "axios";
import {
  useLevels,
  useCreateLevel,
  useDuplicateLevel,
  useDeleteLevel,
} from "../../../queries/useCurriculum";
import { useGrades } from "../../../queries/useGrades";
import type { Level } from "../../../services/curriculum";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ErrorMessage from "../../../components/common/ErrorMessage";
import EmptyState from "../../../components/common/EmptyState";
import ConfirmDeleteModal from "../../../components/common/ConfirmDeleteModal";

function apiError(e: unknown, fallback: string) {
  return (e as AxiosError<{ error: string }>)?.response?.data?.error ?? fallback;
}

const EMPTY_FORM = { label: "", grade_id: "", sort_order: 0 };

export default function Curriculum() {
  const { data: levels, isLoading, isError, refetch } = useLevels();
  const { data: grades } = useGrades();
  const createLevel = useCreateLevel();
  const duplicateLevel = useDuplicateLevel();
  const deleteLevel = useDeleteLevel();

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [toDelete, setToDelete] = useState<Level | null>(null);
  // the level being copied; its groups and subjects come along automatically
  const [toDuplicate, setToDuplicate] = useState<Level | null>(null);
  const [dupForm, setDupForm] = useState(EMPTY_FORM);

  const gradeName = (id: string | null) =>
    grades?.find((g) => g.id === id)?.name ?? null;

  const openCreate = () => {
    setForm(EMPTY_FORM);
    createLevel.reset();
    setCreateOpen(true);
  };

  const handleCreate = () => {
    createLevel.mutate(
      {
        label: form.label.trim(),
        grade_id: form.grade_id || undefined,
        sort_order: form.sort_order,
      },
      { onSuccess: () => setCreateOpen(false) },
    );
  };

  const openDuplicate = (l: Level) => {
    duplicateLevel.reset();
    // labels are unique, so pre-fill something that will not collide
    setDupForm({
      label: `${l.label} (copy)`,
      grade_id: l.grade_id ?? "",
      sort_order: l.sort_order + 1,
    });
    setToDuplicate(l);
  };

  const handleDuplicate = () => {
    if (!toDuplicate) return;
    duplicateLevel.mutate(
      {
        id: toDuplicate.id,
        data: {
          label: dupForm.label.trim(),
          grade_id: dupForm.grade_id || undefined,
          sort_order: dupForm.sort_order,
        },
      },
      { onSuccess: () => setToDuplicate(null) },
    );
  };

  const handleDelete = () => {
    if (!toDelete) return;
    deleteLevel.mutate(toDelete.id, { onSettled: () => setToDelete(null) });
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
          <h1 className="os-page__title">Curriculum</h1>
          <p className="os-page__subtitle">
            A level is any container you name — a grade, a stream, an exam stage.
            Each level holds selection groups that decide what students pick.
          </p>
        </div>
        <Button renderIcon={Add} kind="primary" size="md" onClick={openCreate}>
          New Level
        </Button>
      </div>

      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">Levels</h2>
          {levels && (
            <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>
              {levels.length} total
            </span>
          )}
        </div>

        {isLoading && <LoadingSpinner />}
        {isError && (
          <ErrorMessage message="Could not load levels." onRetry={refetch} />
        )}

        {deleteLevel.isError && (
          <InlineNotification
            kind="error"
            title="Could not delete level"
            subtitle={apiError(
              deleteLevel.error,
              "The level may have students enrolled through its groups.",
            )}
            lowContrast
            onClose={() => deleteLevel.reset()}
            style={{ maxWidth: "100%", margin: "0 1.5rem 1rem" }}
          />
        )}

        {!isLoading && !isError && levels?.length === 0 && (
          <EmptyState
            title="No levels yet"
            description="Create a level for each place a distinct set of subject rules applies — for example one per grade, or one per stream."
            action={
              <Button renderIcon={Add} kind="primary" onClick={openCreate}>
                New Level
              </Button>
            }
          />
        )}

        {levels && levels.length > 0 && (
          <div>
            {levels.map((l, i) => (
              <div
                key={l.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "1.25rem 1.5rem",
                  borderBottom:
                    i < levels.length - 1 ? "1px solid #e0e0e0" : "none",
                  gap: "1rem",
                }}
              >
                <Layers size={20} style={{ fill: "#406AAF", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      margin: "0 0 0.125rem",
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      color: "#161616",
                    }}
                  >
                    {l.label}
                  </p>
                  <p
                    style={{ margin: 0, fontSize: "0.75rem", color: "#525252" }}
                  >
                    Order {l.sort_order}
                  </p>
                </div>
                {gradeName(l.grade_id) ? (
                  <Tag type="teal" size="sm">
                    {gradeName(l.grade_id)}
                  </Tag>
                ) : (
                  <Tag type="gray" size="sm">
                    No grade
                  </Tag>
                )}
                <Button
                  kind="ghost"
                  size="sm"
                  renderIcon={ChevronRight}
                  as={Link}
                  to={`/curriculum/${l.id}`}
                >
                  Configure
                </Button>
                <Button
                  kind="ghost"
                  size="sm"
                  renderIcon={Copy}
                  onClick={() => openDuplicate(l)}
                >
                  Duplicate
                </Button>
                <Button
                  kind="danger--ghost"
                  size="sm"
                  onClick={() => setToDelete(l)}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      <ComposedModal
        open={createOpen}
        size="sm"
        onClose={() => setCreateOpen(false)}
      >
        <ModalHeader title="New level" />
        <ModalBody>
          {createLevel.isError && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={apiError(createLevel.error, "Failed to create level")}
              lowContrast
              hideCloseButton
              style={{ marginBottom: "1rem", maxWidth: "100%" }}
            />
          )}
          <div style={{ display: "grid", gap: "1rem" }}>
            <TextInput
              id="level-label"
              labelText="Label"
              placeholder="e.g. Grade 10, or Physical Science"
              value={form.label}
              onChange={(e) =>
                setForm((f) => ({ ...f, label: e.target.value }))
              }
            />
            <Select
              id="level-grade"
              labelText="Grade (optional)"
              helperText="Link this level to a grade, or leave unset for tracks that span grades."
              value={form.grade_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, grade_id: e.target.value }))
              }
            >
              <SelectItem value="" text="No grade" />
              {grades?.map((g) => (
                <SelectItem key={g.id} value={g.id} text={g.name} />
              ))}
            </Select>
            <NumberInput
              id="level-sort"
              label="Sort order"
              min={0}
              value={form.sort_order}
              onChange={(_e, { value }) =>
                setForm((f) => ({ ...f, sort_order: Number(value) || 0 }))
              }
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
          <Button
            kind="primary"
            onClick={handleCreate}
            disabled={!form.label.trim() || createLevel.isPending}
          >
            {createLevel.isPending ? "Creating…" : "Create"}
          </Button>
        </ModalFooter>
      </ComposedModal>

      {/* Duplicate modal */}
      <ComposedModal
        open={!!toDuplicate}
        size="md"
        onClose={() => setToDuplicate(null)}
      >
        <ModalHeader title={`Duplicate ${toDuplicate?.label ?? ""}`} />
        <ModalBody>
          {duplicateLevel.isError && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={apiError(
                duplicateLevel.error,
                "Failed to duplicate level",
              )}
              lowContrast
              hideCloseButton
              style={{ marginBottom: "1rem", maxWidth: "100%" }}
            />
          )}
          <p
            style={{
              fontSize: "0.875rem",
              color: "#525252",
              marginBottom: "1rem",
            }}
          >
            Every selection group and its subjects are copied to the new level.
            Editing one afterwards does not affect the other.
          </p>
          <div style={{ display: "grid", gap: "1.25rem" }}>
            <TextInput
              id="dup-label"
              labelText="New label"
              helperText="Must differ from every existing level."
              value={dupForm.label}
              onChange={(e) =>
                setDupForm((f) => ({ ...f, label: e.target.value }))
              }
            />
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
              <Select
                id="dup-grade"
                labelText="Grade (optional)"
                value={dupForm.grade_id}
                onChange={(e) =>
                  setDupForm((f) => ({ ...f, grade_id: e.target.value }))
                }
              >
                <SelectItem value="" text="No grade" />
                {grades?.map((g) => (
                  <SelectItem key={g.id} value={g.id} text={g.name} />
                ))}
              </Select>
              <NumberInput
                id="dup-sort"
                label="Sort order"
                min={0}
                value={dupForm.sort_order}
                onChange={(_e, { value }) =>
                  setDupForm((f) => ({ ...f, sort_order: Number(value) || 0 }))
                }
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={() => setToDuplicate(null)}>
            Cancel
          </Button>
          <Button
            kind="primary"
            onClick={handleDuplicate}
            disabled={!dupForm.label.trim() || duplicateLevel.isPending}
          >
            {duplicateLevel.isPending ? "Duplicating…" : "Duplicate"}
          </Button>
        </ModalFooter>
      </ComposedModal>

      <ConfirmDeleteModal
        open={!!toDelete}
        title="Delete level"
        description={
          <>
            Delete <strong>{toDelete?.label}</strong> and all its selection
            groups? This cannot be undone.
          </>
        }
        isPending={deleteLevel.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
