import { Link } from "react-router";
import { Add, ChevronRight, Copy, Edit, Layers } from "@carbon/icons-react";
import { Button, Tag, InlineNotification } from "@carbon/react";
import type { useLevels, useDeleteLevel } from "../../../../queries/useCurriculum";
import type { useGrades } from "../../../../queries/useGrades";
import type { Level } from "../../../../services/curriculum";
import { getErrorMessage } from "../../../../lib/errorMessage";
import ErrorMessage from "../../../../components/common/ErrorMessage";
import EmptyState from "../../../../components/common/EmptyState";
import LevelRowSkeleton from "./LevelRowSkeleton";

interface Props {
  levels: ReturnType<typeof useLevels>["data"];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  grades: ReturnType<typeof useGrades>["data"];
  deleteLevel: ReturnType<typeof useDeleteLevel>;
  onOpenCreate: () => void;
  onEdit: (level: Level) => void;
  onDuplicate: (level: Level) => void;
  onRequestDelete: (level: Level) => void;
}

export default function LevelsList({
  levels,
  isLoading,
  isError,
  refetch,
  grades,
  deleteLevel,
  onOpenCreate,
  onEdit,
  onDuplicate,
  onRequestDelete,
}: Props) {
  const gradeName = (id: string | null) => grades?.find((g) => g.id === id)?.name ?? null;

  return (
    <div className="os-section">
      <div className="os-section__header">
        <h2 className="os-section__title">Levels</h2>
        {levels && <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>{levels.length} total</span>}
      </div>

      {isLoading && (
        <div>
          {Array.from({ length: 4 }).map((_, i) => (
            <LevelRowSkeleton key={i} />
          ))}
        </div>
      )}
      {isError && <ErrorMessage message="Could not load levels." onRetry={refetch} />}

      {deleteLevel.isError && (
        <InlineNotification
          kind="error"
          title="Could not delete level"
          subtitle={getErrorMessage(deleteLevel.error, "The level may have students enrolled through its groups.")}
          lowContrast
          onClose={() => deleteLevel.reset()}
          style={{ maxWidth: "100%", margin: "0 1.5rem 1rem" }}
        />
      )}

      {!isLoading && !isError && levels?.length === 0 && (
        <EmptyState
          title="No levels yet"
          description="Create a level for each place a distinct set of subject rules applies - for example one per grade, or one per stream."
          action={
            <Button renderIcon={Add} kind="primary" onClick={onOpenCreate}>
              New Level
            </Button>
          }
        />
      )}

      {!isLoading && levels && levels.length > 0 && (
        <div>
          {levels.map((l, i) => (
            <div
              key={l.id}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "1.25rem 1.5rem",
                borderBottom: i < levels.length - 1 ? "1px solid #e0e0e0" : "none",
                gap: "1rem",
              }}
            >
              <Layers size={20} style={{ fill: "#406AAF", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ margin: "0 0 0.125rem", fontWeight: 600, fontSize: "0.9rem", color: "#161616" }}>
                  {l.label}
                </p>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#525252" }}>Order {l.sort_order}</p>
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
              <Button kind="ghost" size="sm" renderIcon={ChevronRight} as={Link} to={`/curriculum/${l.id}`}>
                Configure
              </Button>
              <Button kind="ghost" size="sm" renderIcon={Edit} onClick={() => onEdit(l)}>
                Edit
              </Button>
              <Button kind="ghost" size="sm" renderIcon={Copy} onClick={() => onDuplicate(l)}>
                Duplicate
              </Button>
              <Button kind="danger--ghost" size="sm" onClick={() => onRequestDelete(l)}>
                Delete
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
