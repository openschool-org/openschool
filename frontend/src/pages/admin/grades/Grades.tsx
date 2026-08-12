import { useMemo, useState } from "react";
import { Add } from "@carbon/icons-react";
import { Button, InlineNotification, SkeletonText } from "@carbon/react";
import {
  useGrades,
  useCreateGrade,
  useUpdateGrade,
  useDeleteGrade,
  useReorderGrades,
} from "../../../queries/useGrades";
import { useSchool } from "../../../queries/useSchool";
import type { Grade } from "../../../services/grade";
import { getErrorMessage } from "../../../lib/errorMessage";
import ErrorMessage from "../../../components/common/ErrorMessage";
import EmptyState from "../../../components/common/EmptyState";
import ConfirmDeleteModal from "../../../components/common/ConfirmDeleteModal";
import GradeRow from "./components/GradeRow";
import GradeFormModal from "./components/GradeFormModal";

function GradeRowSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "0.875rem 1.5rem",
        borderBottom: "1px solid #e0e0e0",
        gap: "1rem",
      }}
    >
      <SkeletonText width="1.75rem" />
      <SkeletonText width="30%" />
    </div>
  );
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
  const [nameTouched, setNameTouched] = useState(false);

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
    setNameTouched(false);
    setEditing(null);
    setModal("create");
  };

  const openEdit = (g: Grade) => {
    updateGrade.reset();
    setName(g.name);
    setNameTouched(false);
    setEditing(g);
    setModal("edit");
  };

  const handleSave = () => {
    setNameTouched(true);
    if (!name.trim()) return;
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
            The grades this school runs, in order. Reorder with the arrows -
            positions are numbered automatically.
          </p>
        </div>
        <Button renderIcon={Add} kind="primary" size="md" onClick={openCreate}>
          Add Grade
        </Button>
      </div>

      {isError && (
        <ErrorMessage message="Could not load grades." onRetry={refetch} />
      )}

      {deleteGrade.isError && (
        <InlineNotification
          kind="error"
          title="Could not delete grade"
          subtitle={getErrorMessage(
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
          subtitle={getErrorMessage(reorder.error, "Please try again.")}
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

        {isLoading && (
          <div>
            {Array.from({ length: 4 }).map((_, i) => (
              <GradeRowSkeleton key={i} />
            ))}
          </div>
        )}

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

        {!isLoading && ordered.length > 0 && (
          <div style={{ opacity: busy ? 0.6 : 1 }}>
            {ordered.map((g, i) => (
              <GradeRow
                key={g.id}
                grade={g}
                index={i}
                isLast={i === ordered.length - 1}
                from={from}
                to={to}
                busy={busy}
                onMoveUp={() => move(i, -1)}
                onMoveDown={() => move(i, 1)}
                onEdit={() => openEdit(g)}
                onDelete={() => setToDelete(g)}
              />
            ))}
          </div>
        )}
      </div>

      {modal && (
        <GradeFormModal
          mode={modal}
          name={name}
          onNameChange={setName}
          nameTouched={nameTouched}
          onNameBlur={() => setNameTouched(true)}
          onClose={() => setModal(null)}
          onSubmit={handleSave}
          isPending={createGrade.isPending || updateGrade.isPending}
          isError={createGrade.isError || updateGrade.isError}
          error={createGrade.error ?? updateGrade.error}
        />
      )}

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
