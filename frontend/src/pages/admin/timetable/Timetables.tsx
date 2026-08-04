import { useState } from "react";
import { useNavigate } from "react-router";
import { Add } from "@carbon/icons-react";
import {
  Button,
  Tag,
  InlineNotification,
  SkeletonText,
  OverflowMenu,
  OverflowMenuItem,
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@carbon/react";
import { useCurrentAcademicYear } from "../../../queries/useAcademicYears";
import { useCurrentClasses } from "../../../queries/useClasses";
import {
  useTimetablesByYear,
  useCreateTimetable,
  useCopyTimetable,
  useReviseTimetable,
  useDeleteTimetable,
} from "../../../queries/timetable/useTimetables";
import { getErrorMessage } from "../../../lib/errorMessage";
import EmptyState from "../../../components/common/EmptyState";
import ErrorMessage from "../../../components/common/ErrorMessage";
import EntityCombobox from "../../../components/common/EntityCombobox";
import ConfirmDeleteModal from "../../../components/common/ConfirmDeleteModal";
import type { TimetableWithClass } from "../../../services/timetable/timetable";

const STATUS_TAG: Record<string, { type: "gray" | "blue" | "green" | "teal" | "red" | "magenta"; label: string }> = {
  draft: { type: "gray", label: "Draft" },
  under_review: { type: "blue", label: "Under Review" },
  approved: { type: "teal", label: "Approved" },
  published: { type: "green", label: "Published" },
  rejected: { type: "red", label: "Rejected" },
  archived: { type: "magenta", label: "Archived" },
};

export default function Timetables() {
  const navigate = useNavigate();
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: classes } = useCurrentClasses();
  const yearId = currentYear?.id ?? "";
  const { data: timetables, isLoading, isError, refetch } = useTimetablesByYear(yearId);
  const createTimetable = useCreateTimetable();
  const copyTimetable = useCopyTimetable();
  const reviseTimetable = useReviseTimetable();
  const deleteTimetable = useDeleteTimetable();

  const [newClassId, setNewClassId] = useState("");

  const [copySource, setCopySource] = useState<TimetableWithClass | null>(null);
  const [copyTargetClassId, setCopyTargetClassId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<TimetableWithClass | null>(null);

  const handleCreate = () => {
    if (!yearId || !newClassId) return;
    createTimetable.mutate(
      { academic_year_id: yearId, class_id: newClassId },
      { onSuccess: (tt) => navigate(`/timetables/${tt.id}`) },
    );
  };

  const openCopy = (t: TimetableWithClass) => {
    copyTimetable.reset();
    setCopyTargetClassId("");
    setCopySource(t);
  };

  const handleCopy = () => {
    if (!yearId || !copySource || !copyTargetClassId) return;
    copyTimetable.mutate(
      { academic_year_id: yearId, class_id: copyTargetClassId, source_timetable_id: copySource.id },
      { onSuccess: (tt) => navigate(`/timetables/${tt.id}`) },
    );
  };

  const handleRevise = (t: TimetableWithClass) => {
    reviseTimetable.mutate(t.id, { onSuccess: (tt) => navigate(`/timetables/${tt.id}`) });
  };

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Timetables</h1>
          <p className="os-page__subtitle">
            Every class timetable for {currentYear?.label ?? "the current academic year"}. Only the published
            version is visible to teachers, students and guardians.
          </p>
        </div>
      </div>

      <div className="os-section" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", marginBottom: "1.5rem" }}>
          <div style={{ width: "20rem" }}>
            <EntityCombobox
              id="new-timetable-class"
              items={classes ?? []}
              selectedId={newClassId}
              onSelect={setNewClassId}
              getId={(c) => c.id}
              itemToString={(c) => `${c.grade_name} - ${c.name}`}
              labelText="Create a draft timetable for a class"
              placeholder="Search classes…"
            />
          </div>
          <Button renderIcon={Add} kind="primary" onClick={handleCreate} disabled={!newClassId || createTimetable.isPending}>
            {createTimetable.isPending ? "Creating…" : "New Draft"}
          </Button>
        </div>

        {createTimetable.isError && (
          <InlineNotification
            kind="error"
            title="Could not create timetable"
            subtitle={getErrorMessage(createTimetable.error)}
            lowContrast
            onClose={() => createTimetable.reset()}
            style={{ maxWidth: "100%", marginBottom: "1rem" }}
          />
        )}
        {reviseTimetable.isError && (
          <InlineNotification
            kind="error"
            title="Could not revise timetable"
            subtitle={getErrorMessage(reviseTimetable.error)}
            lowContrast
            onClose={() => reviseTimetable.reset()}
            style={{ maxWidth: "100%", marginBottom: "1rem" }}
          />
        )}
        {deleteTimetable.isError && (
          <InlineNotification
            kind="error"
            title="Could not delete timetable"
            subtitle={getErrorMessage(deleteTimetable.error)}
            lowContrast
            onClose={() => deleteTimetable.reset()}
            style={{ maxWidth: "100%", marginBottom: "1rem" }}
          />
        )}

        {!currentYear ? (
          <EmptyState title="No current academic year" description="Set an academic year as current first." />
        ) : isLoading ? (
          <SkeletonText width="40%" />
        ) : isError ? (
          <ErrorMessage message="Could not load timetables." onRetry={refetch} />
        ) : !timetables || timetables.length === 0 ? (
          <EmptyState title="No timetables yet" description="Create a draft timetable for a class above to get started." />
        ) : (
          <table className="os-table">
            <thead>
              <tr>
                <th>Grade</th>
                <th>Class</th>
                <th>Version</th>
                <th>Status</th>
                <th>Updated</th>
                <th style={{ width: "3rem" }} />
              </tr>
            </thead>
            <tbody>
              {timetables.map((t) => (
                <tr key={t.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/timetables/${t.id}`)}>
                  <td>{t.grade_name}</td>
                  <td>{t.class_name}</td>
                  <td>v{t.version}</td>
                  <td>
                    <Tag type={STATUS_TAG[t.status]?.type ?? "gray"} size="sm">
                      {STATUS_TAG[t.status]?.label ?? t.status}
                    </Tag>
                  </td>
                  <td>{t.updated_at ? new Date(t.updated_at).toLocaleString() : "-"}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <OverflowMenu size="sm" flipped>
                      <OverflowMenuItem itemText="Copy to another class" onClick={() => openCopy(t)} />
                      {t.status === "published" && (
                        <OverflowMenuItem itemText="Revise (new draft)" onClick={() => handleRevise(t)} />
                      )}
                      <OverflowMenuItem
                        itemText="Delete"
                        isDelete
                        onClick={() => {
                          deleteTimetable.reset();
                          setDeleteTarget(t);
                        }}
                      />
                    </OverflowMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ComposedModal open={!!copySource} size="sm" onClose={() => setCopySource(null)}>
        <ModalHeader title="Copy timetable" />
        <ModalBody>
          {copyTimetable.isError && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={getErrorMessage(copyTimetable.error, "Failed to copy timetable")}
              lowContrast
              hideCloseButton
              style={{ marginBottom: "1rem", maxWidth: "100%" }}
            />
          )}
          <p style={{ fontSize: "0.8125rem", color: "#525252", marginBottom: "1rem" }}>
            Copies {copySource?.grade_name} — {copySource?.class_name}'s periods into a new draft for another class —
            a new academic year is exactly when this is useful (e.g. carrying 6A's timetable over to 7A).
          </p>
          <EntityCombobox
            id="copy-target-class"
            labelText="Target class"
            items={classes ?? []}
            selectedId={copyTargetClassId}
            onSelect={setCopyTargetClassId}
            getId={(c) => c.id}
            itemToString={(c) => `${c.grade_name} - ${c.name}`}
            placeholder="Search classes…"
          />
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={() => setCopySource(null)}>
            Cancel
          </Button>
          <Button kind="primary" onClick={handleCopy} disabled={!copyTargetClassId || copyTimetable.isPending}>
            {copyTimetable.isPending ? "Copying…" : "Copy"}
          </Button>
        </ModalFooter>
      </ComposedModal>

      <ConfirmDeleteModal
        open={!!deleteTarget}
        title="Delete timetable"
        description={
          <>
            Delete the {deleteTarget?.grade_name} — {deleteTarget?.class_name} v{deleteTarget?.version} timetable?
            This cannot be undone.
          </>
        }
        isPending={deleteTimetable.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteTimetable.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
        }}
      />
    </div>
  );
}
