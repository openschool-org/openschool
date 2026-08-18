// This file renders the merged Grades & Classes admin page: an accordion of
// grades (create/edit/delete/reorder), each expanding to the classes in it
// for the current academic year (view/delete, add a class into that grade).

import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Add, ArrowDown, ArrowUp, ChevronRight, Warning } from "@carbon/icons-react";
import {
  Accordion,
  AccordionItem,
  Button,
  InlineNotification,
  SkeletonIcon,
  SkeletonText,
  Tag,
} from "@carbon/react";
import {
  useCurrentClasses,
  useDeleteClass,
  useStreams,
} from "../../../queries/useClasses";
import {
  useGrades,
  useCreateGrade,
  useUpdateGrade,
  useDeleteGrade,
  useReorderGrades,
} from "../../../queries/useGrades";
import { useTeachers } from "../../../queries/useTeachers";
import { useSchool } from "../../../queries/useSchool";
import type { Grade } from "../../../services/grade";
import type { ClassWithDetails } from "../../../services/class";
import { getErrorMessage } from "../../../lib/errorMessage";
import ErrorMessage from "../../../components/common/ErrorMessage";
import EmptyState from "../../../components/common/EmptyState";
import ConfirmDeleteModal from "../../../components/common/ConfirmDeleteModal";
import AgentFindingsBanner from "../../../components/common/AgentFindingsBanner";
import GradeFormModal from "../grades/components/GradeFormModal";

function gradeNumber(name: string): number | null {
  const m = name.match(/\d+/);
  return m ? Number(m[0]) : null;
}

function gradeNameWarning(name: string, from: number | null, to: number | null): string | null {
  const n = gradeNumber(name);
  if (n === null) return "No number in this name";
  if (from !== null && n < from) return `Below your grade range (${from}-${to})`;
  if (to !== null && n > to) return `Above your grade range (${from}-${to})`;
  return null;
}

function GradeGroupSkeleton() {
  return (
    <div
      style={{
        border: "1px solid #e0e0e0",
        marginBottom: "1px",
        padding: "0.875rem 1.25rem",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
      }}
    >
      <SkeletonIcon />
      <SkeletonText width="20%" />
    </div>
  );
}

function GradeGroup({
  grade,
  index,
  isLast,
  from,
  to,
  busy,
  classes,
  open,
  onToggleOpen,
  onMoveUp,
  onMoveDown,
  onEditGrade,
  onDeleteGrade,
  onDeleteClass,
  streamName,
  teacherName,
}: {
  grade: Grade;
  index: number;
  isLast: boolean;
  from: number | null;
  to: number | null;
  busy: boolean;
  classes: ClassWithDetails[];
  open: boolean;
  onToggleOpen: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEditGrade: () => void;
  onDeleteGrade: () => void;
  onDeleteClass: (c: ClassWithDetails) => void;
  streamName: (id: string | null) => string | null;
  teacherName: (id: string | null) => string | null;
}) {
  const warning = gradeNameWarning(grade.name, from, to);

  const title = (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
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
        {index + 1}
      </span>

      <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "#161616" }}>{grade.name}</span>

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

      <Tag type="gray" size="sm">
        {classes.length} {classes.length === 1 ? "class" : "classes"}
      </Tag>
    </div>
  );

  return (
    <AccordionItem
      title={title}
      open={open}
      onHeadingClick={onToggleOpen}
      aria-label={`${grade.name} — ${classes.length} classes`}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "0.5rem",
          marginBottom: "1rem",
        }}
      >
        <Button
          hasIconOnly
          kind="ghost"
          size="sm"
          iconDescription="Move up"
          renderIcon={ArrowUp}
          disabled={index === 0 || busy}
          onClick={onMoveUp}
        />
        <Button
          hasIconOnly
          kind="ghost"
          size="sm"
          iconDescription="Move down"
          renderIcon={ArrowDown}
          disabled={isLast || busy}
          onClick={onMoveDown}
        />
        <Button kind="ghost" size="sm" disabled={busy} onClick={onEditGrade}>
          Edit Grade
        </Button>
        <Button kind="danger--ghost" size="sm" disabled={busy} onClick={onDeleteGrade}>
          Delete Grade
        </Button>
      </div>

      {classes.length === 0 ? (
        <p style={{ fontSize: "0.8125rem", color: "#6f6f6f", margin: "0 0 1rem" }}>
          No classes yet for this grade.
        </p>
      ) : (
        <table className="os-table">
          <thead>
            <tr>
              <th>Class</th>
              <th>Form Teacher</th>
              <th>Stream</th>
              <th style={{ width: "12rem" }} />
            </tr>
          </thead>
          <tbody>
            {classes.map((c) => (
              <tr key={c.id}>
                <td style={{ fontWeight: 500 }}>{c.name}</td>
                <td className="os-table__muted">
                  {teacherName(c.form_teacher_id) ?? "No form teacher"}
                </td>
                <td>
                  {streamName(c.stream_id) && (
                    <Tag type="blue" size="sm">
                      {streamName(c.stream_id)}
                    </Tag>
                  )}
                </td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <Button
                    kind="ghost"
                    size="sm"
                    renderIcon={ChevronRight}
                    as={Link}
                    to={`/classes/${c.id}`}
                  >
                    View
                  </Button>
                  <Button kind="danger--ghost" size="sm" onClick={() => onDeleteClass(c)}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: "0.75rem" }}>
        <Button
          kind="ghost"
          size="sm"
          renderIcon={Add}
          as={Link}
          to={`/classes/new?grade_id=${grade.id}`}
        >
          Add class to {grade.name}
        </Button>
      </div>
    </AccordionItem>
  );
}

export default function Classes() {
  const {
    data: grades,
    isLoading: gradesLoading,
    isError: gradesError,
    refetch: refetchGrades,
  } = useGrades();
  const {
    data: classes,
    isLoading: classesLoading,
    isError: classesError,
    refetch: refetchClasses,
  } = useCurrentClasses();
  const { data: streams } = useStreams();
  const { data: teachers } = useTeachers();
  const { data: school } = useSchool();

  const createGrade = useCreateGrade();
  const updateGrade = useUpdateGrade();
  const deleteGrade = useDeleteGrade();
  const reorder = useReorderGrades();
  const deleteClass = useDeleteClass();

  const [gradeModal, setGradeModal] = useState<"create" | "edit" | null>(null);
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [gradeName, setGradeName] = useState("");
  const [gradeNameTouched, setGradeNameTouched] = useState(false);
  const [gradeToDelete, setGradeToDelete] = useState<Grade | null>(null);
  const [classToDelete, setClassToDelete] = useState<ClassWithDetails | null>(null);
  const [openGrades, setOpenGrades] = useState<Set<string>>(new Set());

  const orderedGrades = useMemo(() => {
    if (!grades) return [];
    return [...grades].sort(
      (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
    );
  }, [grades]);

  const classesByGrade = useMemo(() => {
    const map = new Map<string, ClassWithDetails[]>();
    for (const c of classes ?? []) {
      const list = map.get(c.grade_id) ?? [];
      list.push(c);
      map.set(c.grade_id, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return map;
  }, [classes]);

  const duplicateCount = useMemo(() => {
    const seen = new Map<number, number>();
    orderedGrades.forEach((g) =>
      seen.set(g.sort_order, (seen.get(g.sort_order) ?? 0) + 1),
    );
    return [...seen.values()].filter((n) => n > 1).reduce((a, b) => a + b, 0);
  }, [orderedGrades]);

  const needsRenumber = orderedGrades.some((g, i) => g.sort_order !== i);

  const streamName = (id: string | null) =>
    id ? (streams?.find((s) => s.id === id)?.name ?? null) : null;
  const teacherName = (id: string | null) =>
    id ? (teachers?.find((t) => t.id === id)?.full_name ?? null) : null;

  const move = (index: number, direction: -1 | 1) => {
    const next = [...orderedGrades];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    reorder.mutate(next);
  };

  const toggleOpen = (id: string) =>
    setOpenGrades((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const openCreateGrade = () => {
    createGrade.reset();
    setGradeName("");
    setGradeNameTouched(false);
    setEditingGrade(null);
    setGradeModal("create");
  };

  const openEditGrade = (g: Grade) => {
    updateGrade.reset();
    setGradeName(g.name);
    setGradeNameTouched(false);
    setEditingGrade(g);
    setGradeModal("edit");
  };

  const handleSaveGrade = () => {
    setGradeNameTouched(true);
    if (!gradeName.trim()) return;
    if (gradeModal === "create") {
      createGrade.mutate(
        { name: gradeName.trim(), sort_order: orderedGrades.length },
        { onSuccess: () => setGradeModal(null) },
      );
    } else if (editingGrade) {
      updateGrade.mutate(
        {
          id: editingGrade.id,
          data: { name: gradeName.trim(), sort_order: editingGrade.sort_order },
        },
        { onSuccess: () => setGradeModal(null) },
      );
    }
  };

  const handleDeleteGrade = () => {
    if (!gradeToDelete) return;
    deleteGrade.mutate(gradeToDelete.id, { onSettled: () => setGradeToDelete(null) });
  };

  const handleDeleteClass = () => {
    if (!classToDelete) return;
    deleteClass.mutate(classToDelete.id, { onSettled: () => setClassToDelete(null) });
  };

  const from = school?.grade_from ?? null;
  const to = school?.grade_to ?? null;
  const busy = reorder.isPending;
  const isLoading = gradesLoading || classesLoading;
  const isError = gradesError || classesError;

  return (
    <div className="os-page">
      <div
        className="os-page__header"
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          rowGap: "0.75rem",
        }}
      >
        <div>
          <h1 className="os-page__title">Grades &amp; Classes</h1>
          <p className="os-page__subtitle">
            The grades this school runs, and their classes for the current
            academic year. Reorder grades with the arrows.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Button renderIcon={Add} kind="secondary" size="md" onClick={openCreateGrade}>
            Add Grade
          </Button>
          <Button renderIcon={Add} kind="primary" size="md" as={Link} to="/classes/new">
            Add Class
          </Button>
        </div>
      </div>

      <AgentFindingsBanner
        jobNames={[
          "empty_grade_watcher",
          "employment_status_consistency",
          "unclassed_student_watcher",
        ]}
      />

      {isError && (
        <ErrorMessage
          message="Could not load grades and classes."
          onRetry={() => {
            refetchGrades();
            refetchClasses();
          }}
        />
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

      {deleteClass.isError && (
        <InlineNotification
          kind="error"
          title="Could not delete class"
          subtitle={getErrorMessage(
            deleteClass.error,
            "The class may still have students enrolled.",
          )}
          lowContrast
          onClose={() => deleteClass.reset()}
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

      {!isLoading && !isError && needsRenumber && orderedGrades.length > 0 && (
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
            onClick={() => reorder.mutate(orderedGrades)}
          >
            {busy ? "Fixing…" : "Fix ordering"}
          </Button>
        </div>
      )}

      {isLoading && (
        <div>
          {Array.from({ length: 4 }).map((_, i) => (
            <GradeGroupSkeleton key={i} />
          ))}
        </div>
      )}

      {!isLoading && !isError && orderedGrades.length === 0 && (
        <EmptyState
          title="No grades yet"
          description="Add the grades this school runs, then create classes under each one."
          action={
            <Button renderIcon={Add} kind="primary" onClick={openCreateGrade}>
              Add Grade
            </Button>
          }
        />
      )}

      {!isLoading && orderedGrades.length > 0 && (
        <div style={{ opacity: busy ? 0.6 : 1 }}>
          <Accordion align="start">
            {orderedGrades.map((g, i) => (
              <GradeGroup
                key={g.id}
                grade={g}
                index={i}
                isLast={i === orderedGrades.length - 1}
                from={from}
                to={to}
                busy={busy}
                classes={classesByGrade.get(g.id) ?? []}
                open={openGrades.has(g.id)}
                onToggleOpen={() => toggleOpen(g.id)}
                onMoveUp={() => move(i, -1)}
                onMoveDown={() => move(i, 1)}
                onEditGrade={() => openEditGrade(g)}
                onDeleteGrade={() => setGradeToDelete(g)}
                onDeleteClass={(c) => setClassToDelete(c)}
                streamName={streamName}
                teacherName={teacherName}
              />
            ))}
          </Accordion>
        </div>
      )}

      {gradeModal && (
        <GradeFormModal
          mode={gradeModal}
          name={gradeName}
          onNameChange={setGradeName}
          nameTouched={gradeNameTouched}
          onNameBlur={() => setGradeNameTouched(true)}
          onClose={() => setGradeModal(null)}
          onSubmit={handleSaveGrade}
          isPending={gradeModal === "edit" ? updateGrade.isPending : createGrade.isPending}
          isError={gradeModal === "edit" ? updateGrade.isError : createGrade.isError}
          error={gradeModal === "edit" ? updateGrade.error : createGrade.error}
        />
      )}

      <ConfirmDeleteModal
        open={!!gradeToDelete}
        title="Delete grade"
        description={
          <>
            Delete <strong>{gradeToDelete?.name}</strong>? This is blocked
            while a class or curriculum level uses it.
          </>
        }
        isPending={deleteGrade.isPending}
        onClose={() => setGradeToDelete(null)}
        onConfirm={handleDeleteGrade}
      />

      <ConfirmDeleteModal
        open={!!classToDelete}
        title="Delete class"
        description={
          <>
            Delete <strong>{classToDelete?.name}</strong>? This is blocked
            while students are still enrolled in it.
          </>
        }
        isPending={deleteClass.isPending}
        onClose={() => setClassToDelete(null)}
        onConfirm={handleDeleteClass}
      />
    </div>
  );
}
