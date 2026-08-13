import { useState } from "react";
import { Idea, Add, Edit, TrashCan } from "@carbon/icons-react";
import { Button, Select, SelectItem, InlineNotification, SkeletonText } from "@carbon/react";
import { useCurrentAcademicYear, useAcademicYears } from "../../../queries/useAcademicYears";
import { useSocieties, useSocietyYears, useDeleteSociety } from "../../../queries/useSocieties";
import { getErrorMessage } from "../../../lib/errorMessage";
import EmptyState from "../../../components/common/EmptyState";
import ErrorMessage from "../../../components/common/ErrorMessage";
import ConfirmDeleteModal from "../../../components/common/ConfirmDeleteModal";
import SocietyFormModal from "../../../components/societies/SocietyFormModal";
import SocietyRoster from "../../../components/societies/SocietyRoster";
import type { Society } from "../../../services/society";

export default function Societies() {
  const { data: currentYear, isLoading: yearLoading } = useCurrentAcademicYear();
  const { data: allYears } = useAcademicYears();
  const { data: pastYears } = useSocietyYears();

  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const viewingYearId = selectedYearId ?? currentYear?.id ?? "";
  const isArchive = !!currentYear && viewingYearId !== currentYear.id;

  const { data: societies, isLoading: societiesLoading, isError, refetch } = useSocieties(viewingYearId);
  const deleteSociety = useDeleteSociety();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formSociety, setFormSociety] = useState<Society | null | "new">(null);
  const [deleting, setDeleting] = useState<Society | null>(null);

  const selected = (societies ?? []).find((s) => s.id === selectedId) ?? null;

  const loading = yearLoading || societiesLoading;

  // Years selectable in the archive dropdown: every year with a society on
  // record, plus the current year even if it has none yet — same pattern as
  // Prefects.tsx.
  const selectableYears = (() => {
    const byId = new Map((allYears ?? []).map((y) => [y.id, y]));
    const ids = new Set((pastYears ?? []).map((y) => y.id));
    if (currentYear) ids.add(currentYear.id);
    return Array.from(ids)
      .map((id) => byId.get(id))
      .filter((y): y is NonNullable<typeof y> => !!y)
      .sort((a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? ""));
  })();

  const handleDelete = () => {
    if (!deleting) return;
    deleteSociety.mutate(
      { id: deleting.id, academicYearId: deleting.academic_year_id },
      {
        onSuccess: () => {
          if (selectedId === deleting.id) setSelectedId(null);
          setDeleting(null);
        },
      },
    );
  };

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Societies</h1>
          <p className="os-page__subtitle">
            {isArchive
              ? `Read-only archive — societies for ${allYears?.find((y) => y.id === viewingYearId)?.label ?? "this year"}.`
              : `Clubs and societies with a Teacher-in-Charge for ${currentYear?.label ?? "the current year"}.`}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "0.75rem" }}>
          <Select
            id="society-year-selector"
            labelText="Year"
            value={viewingYearId}
            onChange={(e) => setSelectedYearId(e.target.value || null)}
            style={{ minWidth: "12rem" }}
          >
            {selectableYears.map((y) => (
              <SelectItem key={y.id} value={y.id} text={y.id === currentYear?.id ? `${y.label} (current)` : y.label} />
            ))}
          </Select>
          <Button
            renderIcon={Add}
            kind="primary"
            size="md"
            onClick={() => setFormSociety("new")}
            disabled={!currentYear || isArchive}
          >
            New Society
          </Button>
        </div>
      </div>

      {isArchive && (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="Viewing a past year"
          subtitle="This is a read-only archive. Switch to the current year to make changes."
          style={{ marginBottom: "1.5rem", maxWidth: "100%" }}
        />
      )}

      {!yearLoading && !currentYear && (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="No current academic year"
          subtitle="Set an academic year as current before creating societies."
          style={{ marginBottom: "1.5rem", maxWidth: "100%" }}
        />
      )}

      {isError && (
        <div style={{ marginBottom: "1.5rem" }}>
          <ErrorMessage message="Could not load societies." onRetry={refetch} />
        </div>
      )}

      {deleteSociety.isError && (
        <InlineNotification
          kind="error"
          lowContrast
          title="Could not delete society"
          subtitle={getErrorMessage(deleteSociety.error, "Please try again.")}
          onClose={() => deleteSociety.reset()}
          style={{ marginBottom: "1.5rem", maxWidth: "100%" }}
        />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "20rem 1fr", gap: "1.5rem", alignItems: "start" }}>
        <div className="os-section" style={{ marginTop: 0 }}>
          {loading && (
            <div style={{ padding: "1.25rem 1.5rem" }}>
              <SkeletonText width="60%" />
            </div>
          )}

          {!loading && (societies ?? []).length === 0 && (
            <EmptyState title="No societies yet" description="Create a society and assign its Teacher-in-Charge." />
          )}

          {!loading &&
            (societies ?? []).map((s, i) => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "0.875rem 1.5rem",
                  border: "none",
                  borderBottom: i < (societies ?? []).length - 1 ? "1px solid #e0e0e0" : "none",
                  background: selected?.id === s.id ? "#edf5ff" : "transparent",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#161616" }}>{s.name}</div>
                <div style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>
                  TIC: {s.teacher_name} · {s.member_count} member{s.member_count === 1 ? "" : "s"}
                </div>
              </button>
            ))}
        </div>

        {selected ? (
          <div className="os-section" style={{ marginTop: 0 }}>
            <div className="os-section__header">
              <h2 className="os-section__title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Idea size={16} style={{ fill: "#406AAF" }} /> {selected.name}
              </h2>
              {!isArchive && (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <Button
                    hasIconOnly
                    kind="ghost"
                    size="sm"
                    iconDescription="Edit"
                    renderIcon={Edit}
                    onClick={() => setFormSociety(selected)}
                  />
                  <Button
                    hasIconOnly
                    kind="ghost"
                    size="sm"
                    iconDescription="Delete"
                    renderIcon={TrashCan}
                    onClick={() => setDeleting(selected)}
                  />
                </div>
              )}
            </div>
            <div className="os-section__body">
              <p style={{ margin: "0 0 1.25rem", fontSize: "0.8125rem", color: "#525252" }}>
                Teacher-in-Charge: {selected.teacher_name}
              </p>
              <SocietyRoster societyId={selected.id} academicYearId={selected.academic_year_id} readOnly={isArchive} />
            </div>
          </div>
        ) : (
          <div className="os-section" style={{ marginTop: 0 }}>
            <EmptyState title="Select a society" description="Pick a society from the list to manage its roster." />
          </div>
        )}
      </div>

      {formSociety !== null && currentYear && (
        <SocietyFormModal
          society={formSociety === "new" ? null : formSociety}
          academicYearId={currentYear.id}
          onClose={() => setFormSociety(null)}
        />
      )}

      <ConfirmDeleteModal
        open={!!deleting}
        title="Delete society"
        description={`Delete "${deleting?.name}"? This removes its entire roster and cannot be undone.`}
        isPending={deleteSociety.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
