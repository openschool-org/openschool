import { useMemo, useState } from "react";
import { Add, ArrowUp, ArrowDown, Warning } from "@carbon/icons-react";
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
  useGrades,
  useCreateGrade,
  useUpdateGrade,
  useDeleteGrade,
  useReorderGrades,
} from "../../../queries/useGrades";
import { useSchool } from "../../../queries/useSchool";
import type { Grade } from "../../../services/grade";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ErrorMessage from "../../../components/common/ErrorMessage";
import EmptyState from "../../../components/common/EmptyState";
import ConfirmDeleteModal from "../../../components/common/ConfirmDeleteModal";

function apiError(e: unknown, fallback: string) {
  return (e as AxiosError<{ error: string }>)?.response?.data?.error ?? fallback;
}

// Grade names are free text, so these checks are advisory only — they point at
// rows that look wrong rather than blocking anything.
function gradeNumber(name: string): number | null {
  const m = name.match(/\d+/);
  return m ? Number(m[0]) : null;
}

function nameWarning(
  name: string,
  from: number | null,
  to: number | null,
): string | null {
  const n = gradeNumber(name);
  if (n === null) return "No number in this name";
  if (from !== null && n < from) return `Below your grade range (${from}–${to})`;
  if (to !== null && n > to) return `Above your grade range (${from}–${to})`;
  return null;
}

export default function Grades() {
  const { data: grades, isLoading, isError, refetch } = useGrades();
  const { data: school } = useSchool();
  const createGrade = useCreateGrade();
  const updateGrade = useUpdateGrade();
  const deleteGrade = useDeleteGrade();
  const reorder = useReorderGrades();

  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Grade | null>(null);
  const [name, setName] = useState("");
  const [toDelete, setToDelete] = useState<Grade | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  // display order: sort_order first, name as a stable tie-break so duplicated
  // orders still render deterministically
  const ordered = useMemo(() => {
    if (!grades) return [];
    return [...grades].sort(
      (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
    );
  }, [grades]);

  const duplicateCount = useMemo(() => {
    const seen = new Map<number, number>();
    ordered.forEach((g) =>
      seen.set(g.sort_order, (seen.get(g.sort_order) ?? 0) + 1),
    );
    return [...seen.values()].filter((n) => n > 1).reduce((a, b) => a + b, 0);
  }, [ordered]);

  const needsRenumber = ordered.some((g, i) => g.sort_order !== i);

  const move = (index: number, direction: -1 | 1) => {
    const next = [...ordered];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    reorder.mutate(next);
  };

  const openCreate = () => {
    createGrade.reset();
    setName("");
    setEditing(null);
    setModal("create");
  };

  const openEdit = (g: Grade) => {
    updateGrade.reset();
    setName(g.name);
    setEditing(g);
    setModal("edit");
  };

  const handleSave = () => {
    if (modal === "create") {
      // new grades land at the end; position is never typed
      createGrade.mutate(
        { name: name.trim(), sort_order: ordered.length },
        { onSuccess: () => setModal(null) },
      );
    } else if (editing) {
      updateGrade.mutate(
        {
          id: editing.id,
          data: { name: name.trim(), sort_order: editing.sort_order },
        },
        { onSuccess: () => setModal(null) },
      );
    }
  };

  const handleDelete = () => {
    if (!toDelete) return;
    deleteGrade.mutate(toDelete.id, { onSettled: () => setToDelete(null) });
  };

  const from = school?.grade_from ?? null;
  const to = school?.grade_to ?? null;
  const busy = reorder.isPending;

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
          <h1 className="os-page__title">Grades</h1>
          <p className="os-page__subtitle">
            The grades this school runs, in order. Reorder with the arrows —
            positions are numbered automatically.
          </p>
        </div>
        <Button renderIcon={Add} kind="primary" size="md" onClick={openCreate}>
          Add Grade
        </Button>
      </div>

      {isLoading && <LoadingSpinner />}
      {isError && (
        <ErrorMessage message="Could not load grades." onRetry={refetch} />
      )}

      {deleteGrade.isError && (
        <InlineNotification
          kind="error"
          title="Could not delete grade"
          subtitle={apiError(
            deleteGrade.error,
            "The grade may be used by a class or curriculum level.",
          )}
          lowContrast
          onClose={() => deleteGrade.reset()}
          style={{ maxWidth: "100%", marginBottom: "1rem" }}
        />
      )}

      {reorder.isError && (
        <InlineNotification
          kind="error"
          title="Could not reorder"
          subtitle={apiError(reorder.error, "Please try again.")}
          lowContrast
          onClose={() => reorder.reset()}
          style={{ maxWidth: "100%", marginBottom: "1rem" }}
        />
      )}

      {!isLoading && !isError && needsRenumber && ordered.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "1rem",
            flexWrap: "wrap",
          }}
        >
          <InlineNotification
            kind="warning"
            title={
              duplicateCount > 0
                ? `${duplicateCount} grades share the same position`
                : "Positions have gaps"
            }
            subtitle="Renumber them in the order shown below."
            lowContrast
            hideCloseButton
            style={{ maxWidth: "100%", margin: 0, flex: 1 }}
          />
          <Button
            kind="tertiary"
            size="sm"
            disabled={busy}
            onClick={() => reorder.mutate(ordered)}
          >
            {busy ? "Fixing…" : "Fix ordering"}
          </Button>
        </div>
      )}

      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">All Grades</h2>
          {grades && (
            <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>
              {grades.length} total
            </span>
          )}
        </div>

        {!isLoading && !isError && ordered.length === 0 && (
          <EmptyState
            title="No grades yet"
            description="Add the grades this school runs. Classes and curriculum levels attach to them."
            action={
              <Button renderIcon={Add} kind="primary" onClick={openCreate}>
                Add Grade
              </Button>
            }
          />
        )}

        {ordered.length > 0 && (
          <div style={{ opacity: busy ? 0.6 : 1 }}>
            {ordered.map((g, i) => {
              const warning = nameWarning(g.name, from, to);
              return (
                <div
                  key={g.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "0.875rem 1.5rem",
                    borderBottom:
                      i < ordered.length - 1 ? "1px solid #e0e0e0" : "none",
                    gap: "1rem",
                    backgroundColor:
                      hovered === g.id ? "#f4f4f4" : "transparent",
                  }}
                  onMouseEnter={() => setHovered(g.id)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <span
                    style={{
                      width: "1.75rem",
                      height: "1.75rem",
                      borderRadius: "4px",
                      background: "#edf2fa",
                      color: "#406AAF",
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </span>

                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      color: "#161616",
                    }}
                  >
                    {g.name}
                  </span>

                  {warning && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        fontSize: "0.75rem",
                        color: "#8a6a00",
                      }}
                    >
                      <Warning size={14} style={{ fill: "#b28600" }} />
                      {warning}
                    </span>
                  )}

                  <div style={{ flex: 1 }} />

                  <Button
                    hasIconOnly
                    kind="ghost"
                    size="sm"
                    iconDescription="Move up"
                    renderIcon={ArrowUp}
                    disabled={i === 0 || busy}
                    onClick={() => move(i, -1)}
                  />
                  <Button
                    hasIconOnly
                    kind="ghost"
                    size="sm"
                    iconDescription="Move down"
                    renderIcon={ArrowDown}
                    disabled={i === ordered.length - 1 || busy}
                    onClick={() => move(i, 1)}
                  />
                  <Button
                    kind="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => openEdit(g)}
                  >
                    Edit
                  </Button>
                  <Button
                    kind="danger--ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => setToDelete(g)}
                  >
                    Delete
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ComposedModal open={!!modal} size="sm" onClose={() => setModal(null)}>
        <ModalHeader title={modal === "create" ? "Add grade" : "Edit grade"} />
        <ModalBody>
          {(createGrade.isError || updateGrade.isError) && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={apiError(
                createGrade.error ?? updateGrade.error,
                "Failed to save grade",
              )}
              lowContrast
              hideCloseButton
              style={{ marginBottom: "1rem", maxWidth: "100%" }}
            />
          )}
          <TextInput
            id="grade-name"
            labelText="Name"
            placeholder="e.g. Grade 6"
            helperText={
              modal === "create"
                ? "Added at the end; use the arrows to move it."
                : "Position is changed with the arrows, not here."
            }
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
              !name.trim() || createGrade.isPending || updateGrade.isPending
            }
          >
            {createGrade.isPending || updateGrade.isPending ? "Saving…" : "Save"}
          </Button>
        </ModalFooter>
      </ComposedModal>

      <ConfirmDeleteModal
        open={!!toDelete}
        title="Delete grade"
        description={
          <>
            Delete <strong>{toDelete?.name}</strong>? This is blocked while a
            class or curriculum level uses it.
          </>
        }
        isPending={deleteGrade.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
