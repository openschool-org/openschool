import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Search, Add, Edit, TrashCan } from "@carbon/icons-react";
import { Button, IconButton, InlineNotification } from "@carbon/react";
import { AxiosError } from "axios";
import { useTeachers, useDeleteTeacher } from "../../../queries/useTeachers";
import type { Teacher } from "../../../services/teacher";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ErrorMessage from "../../../components/common/ErrorMessage";
import EmptyState from "../../../components/common/EmptyState";
import ConfirmDeleteModal from "../../../components/common/ConfirmDeleteModal";

function apiError(e: unknown, fallback: string) {
  return (e as AxiosError<{ error: string }>)?.response?.data?.error ?? fallback;
}

export default function Teachers() {
  const navigate = useNavigate();
  const { data: teachers, isLoading, isError, refetch } = useTeachers();
  const deleteTeacher = useDeleteTeacher();
  const [query, setQuery] = useState("");
  const [toDelete, setToDelete] = useState<Teacher | null>(null);

  const filtered = (teachers ?? []).filter((t) => {
    const q = query.toLowerCase();
    return (
      t.full_name.toLowerCase().includes(q) ||
      t.employee_number.toLowerCase().includes(q)
    );
  });

  const handleDelete = () => {
    if (!toDelete) return;
    deleteTeacher.mutate(toDelete.id, {
      onSettled: () => setToDelete(null),
    });
  };

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Teachers</h1>
          <p className="os-page__subtitle">Manage teacher profiles</p>
        </div>
        <Button renderIcon={Add} kind="primary" size="md" as={Link} to="/teachers/new">
          Add Teacher
        </Button>
      </div>

      <div className="os-section">
        <div className="os-toolbar">
          <div className="os-search">
            <Search size={16} className="os-search__icon" />
            <input
              className="os-search__input"
              placeholder="Search by name or employee number…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {deleteTeacher.isError && (
          <InlineNotification
            kind="error"
            title="Could not delete teacher"
            subtitle={apiError(
              deleteTeacher.error,
              "The teacher may be assigned to a class or have attendance records.",
            )}
            lowContrast
            onClose={() => deleteTeacher.reset()}
            style={{ maxWidth: "100%", margin: "0 1.5rem 1rem" }}
          />
        )}

        {isLoading ? (
          <LoadingSpinner />
        ) : isError ? (
          <ErrorMessage message="Failed to load teachers" onRetry={refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No teachers found"
            description="Add your first teacher to get started."
          />
        ) : (
          <>
            <div className="os-section__header">
              <h2 className="os-section__title">All Teachers</h2>
              <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>
                {filtered.length} records
              </span>
            </div>

            <table className="os-table">
              <thead>
                <tr>
                  <th>Employee No.</th>
                  <th>Full Name</th>
                  <th>Phone</th>
                  <th>Joined Date</th>
                  <th style={{ width: "6rem", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <span className="os-table__mono">{t.employee_number}</span>
                    </td>
                    <td>
                      <Link to={`/teachers/${t.id}`} className="os-table__link">
                        {t.full_name}
                      </Link>
                    </td>
                    <td className="os-table__muted">{t.phone ?? "—"}</td>
                    <td className="os-table__muted">{t.joined_date ?? "—"}</td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          gap: "0.25rem",
                          justifyContent: "flex-end",
                        }}
                      >
                        <IconButton
                          label="Edit"
                          kind="ghost"
                          size="sm"
                          onClick={() =>
                            navigate(`/teachers/${t.id}`, {
                              state: { edit: true },
                            })
                          }
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          label="Delete"
                          kind="ghost"
                          size="sm"
                          onClick={() => {
                            deleteTeacher.reset();
                            setToDelete(t);
                          }}
                        >
                          <TrashCan />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      <ConfirmDeleteModal
        open={!!toDelete}
        title="Delete teacher"
        description={
          <>
            Delete <strong>{toDelete?.full_name}</strong>? This removes their
            account and cannot be undone.
          </>
        }
        isPending={deleteTeacher.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
