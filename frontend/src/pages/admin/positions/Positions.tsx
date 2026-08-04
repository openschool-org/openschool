import { useState } from "react";
import { Link } from "react-router";
import { UserRole, Add, TrashCan } from "@carbon/icons-react";
import {
  Button,
  Tag,
  Checkbox,
  MultiSelect,
  InlineNotification,
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  SkeletonText,
} from "@carbon/react";
import { useTeachers } from "../../../queries/useTeachers";
import { useGrades } from "../../../queries/useGrades";
import { usePositions, useAssignPrincipal, useAssignVicePrincipal, useRemovePosition } from "../../../queries/usePositions";
import { getErrorMessage } from "../../../lib/errorMessage";
import EmptyState from "../../../components/common/EmptyState";
import ErrorMessage from "../../../components/common/ErrorMessage";
import EntityCombobox from "../../../components/common/EntityCombobox";
import type { TeacherPosition } from "../../../services/position";

export default function Positions() {
  const { data: teachers } = useTeachers();
  const { data: grades } = useGrades();
  const { data: positions, isLoading, isError, refetch } = usePositions();
  const assignPrincipal = useAssignPrincipal();
  const assignVicePrincipal = useAssignVicePrincipal();
  const removePosition = useRemovePosition();

  const [principalOpen, setPrincipalOpen] = useState(false);
  const [principalChoice, setPrincipalChoice] = useState("");

  const [vpOpen, setVpOpen] = useState(false);
  const [vpTeacherChoice, setVpTeacherChoice] = useState("");
  const [vpWholeSchool, setVpWholeSchool] = useState(false);
  const [vpGradeIds, setVpGradeIds] = useState<string[]>([]);

  const principal = (positions ?? []).find((p) => p.position === "principal");
  const vicePrincipals = (positions ?? []).filter((p) => p.position === "vice_principal");

  const openPrincipal = () => {
    assignPrincipal.reset();
    setPrincipalChoice(principal?.teacher_id ?? "");
    setPrincipalOpen(true);
  };

  const handleAssignPrincipal = () => {
    if (!principalChoice) return;
    assignPrincipal.mutate({ teacher_id: principalChoice }, { onSuccess: () => setPrincipalOpen(false) });
  };

  const openVp = () => {
    assignVicePrincipal.reset();
    setVpTeacherChoice("");
    setVpWholeSchool(false);
    setVpGradeIds([]);
    setVpOpen(true);
  };

  const handleAssignVp = () => {
    if (!vpTeacherChoice) return;
    assignVicePrincipal.mutate(
      {
        teacher_id: vpTeacherChoice,
        notify_whole_school: vpWholeSchool,
        grade_ids: vpWholeSchool ? [] : vpGradeIds,
      },
      { onSuccess: () => setVpOpen(false) },
    );
  };

  const handleRemove = (p: TeacherPosition) => {
    removePosition.mutate(p.id);
  };

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Leadership Positions</h1>
          <p className="os-page__subtitle">
            Principal and Vice Principals — permanent appointments that control notification reach, held until
            resignation or promotion.
          </p>
        </div>
        <Button renderIcon={Add} kind="primary" size="md" onClick={openVp}>
          Add Vice Principal
        </Button>
      </div>

      {isError && (
        <div style={{ marginBottom: "1.5rem" }}>
          <ErrorMessage message="Could not load positions." onRetry={refetch} />
        </div>
      )}

      {removePosition.isError && (
        <InlineNotification
          kind="error"
          lowContrast
          title="Could not remove position"
          subtitle={getErrorMessage(removePosition.error, "Please try again.")}
          onClose={() => removePosition.reset()}
          style={{ marginBottom: "1.5rem", maxWidth: "100%" }}
        />
      )}

      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <UserRole size={16} style={{ fill: "#406AAF" }} /> Principal
          </h2>
        </div>

        {isLoading ? (
          <div style={{ padding: "1.25rem 1.5rem" }}>
            <SkeletonText width="40%" />
          </div>
        ) : !principal ? (
          <EmptyState title="No Principal assigned" description="Assign the school's Principal." />
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.75rem 1.5rem" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Link to={`/teachers/${principal.teacher_id}`} className="os-table__link" style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                {principal.teacher_name}
              </Link>
              <p style={{ margin: "0.1rem 0 0", fontSize: "0.75rem", color: "#525252" }}>Notifies the whole school</p>
            </div>
            <Button kind="ghost" size="sm" onClick={openPrincipal}>
              Change
            </Button>
          </div>
        )}

        {!principal && !isLoading && (
          <div style={{ padding: "0 1.5rem 1.25rem" }}>
            <Button kind="tertiary" size="sm" onClick={openPrincipal}>
              Assign Principal
            </Button>
          </div>
        )}
      </div>

      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <UserRole size={16} style={{ fill: "#406AAF" }} /> Vice Principals
          </h2>
          <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>{vicePrincipals.length}</span>
        </div>

        {isLoading ? (
          <div style={{ padding: "1.25rem 1.5rem" }}>
            <SkeletonText width="40%" />
          </div>
        ) : vicePrincipals.length === 0 ? (
          <EmptyState title="No Vice Principals yet" description="Add a Vice Principal and set their notification reach." />
        ) : (
          <div>
            {vicePrincipals.map((vp, i) => (
              <div
                key={vp.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "0.75rem 1.5rem",
                  borderBottom: i < vicePrincipals.length - 1 ? "1px solid #f4f4f4" : "none",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link to={`/teachers/${vp.teacher_id}`} className="os-table__link" style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                    {vp.teacher_name}
                  </Link>
                </div>
                <Tag type={vp.notify_whole_school ? "blue" : "gray"} size="sm">
                  {vp.notify_whole_school ? "Whole school" : "Scoped to assigned grades"}
                </Tag>
                <Button
                  hasIconOnly
                  kind="ghost"
                  size="sm"
                  iconDescription="Remove"
                  renderIcon={TrashCan}
                  disabled={removePosition.isPending}
                  onClick={() => handleRemove(vp)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <ComposedModal open={principalOpen} size="sm" onClose={() => setPrincipalOpen(false)}>
        <ModalHeader title={principal ? "Change Principal" : "Assign Principal"} />
        <ModalBody>
          {assignPrincipal.isError && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={getErrorMessage(assignPrincipal.error, "Failed to assign Principal")}
              lowContrast
              hideCloseButton
              style={{ marginBottom: "1rem", maxWidth: "100%" }}
            />
          )}
          <EntityCombobox
            id="principal-teacher"
            labelText="Teacher"
            items={teachers ?? []}
            selectedId={principalChoice}
            onSelect={setPrincipalChoice}
            getId={(t) => t.id}
            itemToString={(t) => t.full_name}
            placeholder="Search teachers by name…"
          />
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={() => setPrincipalOpen(false)}>
            Cancel
          </Button>
          <Button kind="primary" onClick={handleAssignPrincipal} disabled={!principalChoice || assignPrincipal.isPending}>
            {assignPrincipal.isPending ? "Saving…" : "Assign"}
          </Button>
        </ModalFooter>
      </ComposedModal>

      <ComposedModal open={vpOpen} size="sm" onClose={() => setVpOpen(false)}>
        <ModalHeader title="Add Vice Principal" />
        <ModalBody>
          {assignVicePrincipal.isError && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={getErrorMessage(assignVicePrincipal.error, "Failed to add Vice Principal")}
              lowContrast
              hideCloseButton
              style={{ marginBottom: "1rem", maxWidth: "100%" }}
            />
          )}
          <div style={{ display: "grid", gap: "1rem" }}>
            <EntityCombobox
              id="vp-teacher"
              labelText="Teacher"
              items={teachers ?? []}
              selectedId={vpTeacherChoice}
              onSelect={setVpTeacherChoice}
              getId={(t) => t.id}
              itemToString={(t) => t.full_name}
              placeholder="Search teachers by name…"
            />
            <Checkbox
              id="vp-whole-school"
              labelText="Can notify the whole school"
              checked={vpWholeSchool}
              onChange={(_e, { checked }) => setVpWholeSchool(checked)}
            />
            {!vpWholeSchool && (
              <MultiSelect
                id="vp-grades"
                titleText="Grades this Vice Principal can notify"
                label="Select grades…"
                items={grades ?? []}
                itemToString={(g) => g?.name ?? ""}
                selectedItems={(grades ?? []).filter((g) => vpGradeIds.includes(g.id))}
                onChange={({ selectedItems }) => setVpGradeIds((selectedItems ?? []).map((g) => g.id))}
              />
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={() => setVpOpen(false)}>
            Cancel
          </Button>
          <Button kind="primary" onClick={handleAssignVp} disabled={!vpTeacherChoice || assignVicePrincipal.isPending}>
            {assignVicePrincipal.isPending ? "Saving…" : "Add"}
          </Button>
        </ModalFooter>
      </ComposedModal>
    </div>
  );
}
