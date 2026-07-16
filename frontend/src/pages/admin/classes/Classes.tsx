import { useState } from "react";
import { Link } from "react-router";
import { Building, Add, ChevronRight } from "@carbon/icons-react";
import { Button, Tag, InlineNotification } from "@carbon/react";
import { AxiosError } from "axios";
import {
  useCurrentClasses,
  useDeleteClass,
  useStreams,
} from "../../../queries/useClasses";
import { useTeachers } from "../../../queries/useTeachers";
import type { ClassWithDetails } from "../../../services/class";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ErrorMessage from "../../../components/common/ErrorMessage";
import EmptyState from "../../../components/common/EmptyState";
import ConfirmDeleteModal from "../../../components/common/ConfirmDeleteModal";

function apiError(e: unknown, fallback: string) {
  return (e as AxiosError<{ error: string }>)?.response?.data?.error ?? fallback;
}

export default function Classes() {
  const { data: classes, isLoading, isError, refetch } = useCurrentClasses();
  const { data: streams } = useStreams();
  const { data: teachers } = useTeachers();
  const deleteClass = useDeleteClass();

  const [toDelete, setToDelete] = useState<ClassWithDetails | null>(null);

  // the list endpoint returns ids for stream and form teacher, so resolve the
  // names from the lists we already hold rather than a request per row
  const streamName = (id: string | null) =>
    id ? (streams?.find((s) => s.id === id)?.name ?? null) : null;
  const teacherName = (id: string | null) =>
    id ? (teachers?.find((t) => t.id === id)?.full_name ?? null) : null;

  const handleDelete = () => {
    if (!toDelete) return;
    deleteClass.mutate(toDelete.id, { onSettled: () => setToDelete(null) });
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
          <h1 className="os-page__title">Classes</h1>
          <p className="os-page__subtitle">
            Classes for the current academic year
          </p>
        </div>
        <Button
          renderIcon={Add}
          kind="primary"
          size="md"
          as={Link}
          to="/classes/new"
        >
          Add Class
        </Button>
      </div>

      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">All Classes</h2>
          {classes && (
            <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>
              {classes.length} total
            </span>
          )}
        </div>

        {isLoading && <LoadingSpinner />}
        {isError && (
          <ErrorMessage message="Could not load classes." onRetry={refetch} />
        )}

        {deleteClass.isError && (
          <InlineNotification
            kind="error"
            title="Could not delete class"
            subtitle={apiError(
              deleteClass.error,
              "The class may still have students enrolled.",
            )}
            lowContrast
            onClose={() => deleteClass.reset()}
            style={{ maxWidth: "100%", margin: "0 1.5rem 1rem" }}
          />
        )}

        {!isLoading && !isError && classes?.length === 0 && (
          <EmptyState
            title="No classes yet"
            description="Create a class for the current academic year. If nothing appears after creating one, check that an academic year is marked current."
            action={
              <Button renderIcon={Add} kind="primary" as={Link} to="/classes/new">
                Add Class
              </Button>
            }
          />
        )}

        {classes && classes.length > 0 && (
          <div>
            {classes.map((c, i) => (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "1.25rem 1.5rem",
                  borderBottom:
                    i < classes.length - 1 ? "1px solid #e0e0e0" : "none",
                  gap: "1rem",
                }}
              >
                <Building size={20} style={{ fill: "#406AAF", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      margin: "0 0 0.125rem",
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      color: "#161616",
                    }}
                  >
                    {c.name}
                  </p>
                  <p
                    style={{ margin: 0, fontSize: "0.75rem", color: "#525252" }}
                  >
                    {c.grade_name}
                    {teacherName(c.form_teacher_id)
                      ? ` · ${teacherName(c.form_teacher_id)}`
                      : " · No form teacher"}
                  </p>
                </div>
                {streamName(c.stream_id) && (
                  <Tag type="blue" size="sm">
                    {streamName(c.stream_id)}
                  </Tag>
                )}
                <Tag type="gray" size="sm">
                  {c.academic_year_label}
                </Tag>
                <Button
                  kind="ghost"
                  size="sm"
                  renderIcon={ChevronRight}
                  as={Link}
                  to={`/classes/${c.id}`}
                >
                  View
                </Button>
                <Button
                  kind="danger--ghost"
                  size="sm"
                  onClick={() => setToDelete(c)}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDeleteModal
        open={!!toDelete}
        title="Delete class"
        description={
          <>
            Delete <strong>{toDelete?.name}</strong>? This is blocked while
            students are still enrolled in it.
          </>
        }
        isPending={deleteClass.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
