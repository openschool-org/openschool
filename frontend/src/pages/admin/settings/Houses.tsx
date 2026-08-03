import { useMemo, useState } from "react";
import { Add } from "@carbon/icons-react";
import {
  Button,
  TextInput,
  Tag,
  InlineNotification,
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  SkeletonText,
} from "@carbon/react";
import {
  useHouses,
  useCreateHouse,
  useUpdateHouse,
  useDeleteHouse,
  useReassignMissingHouses,
  useReassignMissingStaffHouses,
} from "../../../queries/useHouses";
import type { House } from "../../../services/house";
import { getErrorMessage } from "../../../lib/errorMessage";
import ErrorMessage from "../../../components/common/ErrorMessage";
import EmptyState from "../../../components/common/EmptyState";
import ConfirmDeleteModal from "../../../components/common/ConfirmDeleteModal";

const DEFAULT_COLOR = "#0f62fe";

function HouseRowSkeleton() {
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
      <SkeletonText width="1.5rem" />
      <SkeletonText width="30%" />
    </div>
  );
}

export default function Houses() {
  const { data: houses, isLoading, isError, refetch } = useHouses();
  const createHouse = useCreateHouse();
  const updateHouse = useUpdateHouse();
  const deleteHouse = useDeleteHouse();
  const reassign = useReassignMissingHouses();
  const reassignStaff = useReassignMissingStaffHouses();

  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<House | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [toDelete, setToDelete] = useState<House | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [touched, setTouched] = useState<{ name?: boolean }>({});

  const ordered = useMemo(() => {
    if (!houses) return [];
    return [...houses].sort((a, b) => a.name.localeCompare(b.name));
  }, [houses]);

  const openCreate = () => {
    createHouse.reset();
    setName("");
    setCode("");
    setColor(DEFAULT_COLOR);
    setEditing(null);
    setTouched({});
    setModal("create");
  };

  const openEdit = (h: House) => {
    updateHouse.reset();
    setName(h.name);
    setCode(h.code ?? "");
    setColor(h.color || DEFAULT_COLOR);
    setEditing(h);
    setTouched({});
    setModal("edit");
  };

  const handleSave = () => {
    setTouched({ name: true });
    if (!name.trim()) return;
    const data = {
      name: name.trim(),
      code: code.trim() || undefined,
      color,
    };
    if (modal === "create") {
      createHouse.mutate(data, { onSuccess: () => setModal(null) });
    } else if (editing) {
      updateHouse.mutate(
        { id: editing.id, data },
        { onSuccess: () => setModal(null) },
      );
    }
  };

  const handleDelete = () => {
    if (!toDelete) return;
    deleteHouse.mutate(toDelete.id, { onSettled: () => setToDelete(null) });
  };

  return (
    <div>
      <div
        className="os-page__header"
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h2 className="os-section__title" style={{ margin: 0 }}>
            Houses
          </h2>
          <p className="os-page__subtitle" style={{ marginTop: "0.25rem" }}>
            New students and staff are assigned automatically to whichever
            house currently has the fewest members, with random tie-breaks —
            no manual configuration needed as houses are added.
          </p>
        </div>
        <Button renderIcon={Add} kind="primary" size="md" onClick={openCreate}>
          Add House
        </Button>
      </div>

      {isError && (
        <ErrorMessage message="Could not load houses." onRetry={refetch} />
      )}

      {deleteHouse.isError && (
        <InlineNotification
          kind="error"
          title="Could not delete house"
          subtitle={getErrorMessage(
            deleteHouse.error,
            "The house may be assigned to a student or teacher.",
          )}
          lowContrast
          onClose={() => deleteHouse.reset()}
          style={{ maxWidth: "100%", marginBottom: "1rem" }}
        />
      )}

      {(reassign.isSuccess || reassignStaff.isSuccess) && (
        <InlineNotification
          kind="success"
          title="Houses assigned"
          subtitle={[
            reassign.data && `${reassign.data.assigned} student(s)`,
            reassignStaff.data && `${reassignStaff.data.assigned} staff member(s)`,
          ]
            .filter(Boolean)
            .join(" and ") + " assigned a house."}
          lowContrast
          onClose={() => {
            reassign.reset();
            reassignStaff.reset();
          }}
          style={{ maxWidth: "100%", marginBottom: "1rem" }}
        />
      )}

      {(reassign.isError || reassignStaff.isError) && (
        <InlineNotification
          kind="error"
          title="Could not re-assign"
          subtitle={getErrorMessage(reassign.error ?? reassignStaff.error, "Please try again.")}
          lowContrast
          onClose={() => {
            reassign.reset();
            reassignStaff.reset();
          }}
          style={{ maxWidth: "100%", marginBottom: "1rem" }}
        />
      )}

      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">Houses</h2>
          {houses && (
            <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>
              {houses.length} total
            </span>
          )}
        </div>

        {isLoading && (
          <div>
            {Array.from({ length: 4 }).map((_, i) => (
              <HouseRowSkeleton key={i} />
            ))}
          </div>
        )}

        {!isLoading && !isError && ordered.length === 0 && (
          <EmptyState
            title="No houses yet"
            description="Add the houses this school uses. Students and staff are then assigned automatically, balanced across whichever houses exist."
            action={
              <Button renderIcon={Add} kind="primary" onClick={openCreate}>
                Add House
              </Button>
            }
          />
        )}

        {!isLoading && ordered.length > 0 && (
          <div>
            {ordered.map((h, i) => (
              <div
                key={h.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "0.875rem 1.5rem",
                  borderBottom:
                    i < ordered.length - 1 ? "1px solid #e0e0e0" : "none",
                  gap: "1rem",
                  backgroundColor: hovered === h.id ? "#f4f4f4" : "transparent",
                }}
                onMouseEnter={() => setHovered(h.id)}
                onMouseLeave={() => setHovered(null)}
              >
                <span
                  aria-hidden
                  style={{
                    display: "inline-block",
                    width: "1rem",
                    height: "1rem",
                    borderRadius: "50%",
                    backgroundColor: h.color,
                    border: "1px solid rgba(0,0,0,0.1)",
                    flexShrink: 0,
                  }}
                />

                <span
                  style={{
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    color: "#161616",
                  }}
                >
                  {h.name}
                </span>

                {h.code && (
                  <Tag type="cool-gray" size="sm">
                    {h.code}
                  </Tag>
                )}

                <div style={{ flex: 1 }} />

                <Button kind="ghost" size="sm" onClick={() => openEdit(h)}>
                  Edit
                </Button>
                <Button
                  kind="danger--ghost"
                  size="sm"
                  onClick={() => setToDelete(h)}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {ordered.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <Button
            kind="tertiary"
            size="md"
            disabled={reassign.isPending}
            onClick={() => reassign.mutate()}
          >
            {reassign.isPending
              ? "Assigning…"
              : "Re-assign students without a house"}
          </Button>
          <Button
            kind="tertiary"
            size="md"
            disabled={reassignStaff.isPending}
            onClick={() => reassignStaff.mutate()}
          >
            {reassignStaff.isPending
              ? "Assigning…"
              : "Re-assign staff without a house"}
          </Button>
          <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>
            Useful after setting up houses — people added earlier get one too.
          </span>
        </div>
      )}

      <ComposedModal open={!!modal} size="sm" onClose={() => setModal(null)}>
        <ModalHeader title={modal === "create" ? "Add house" : "Edit house"} />
        <ModalBody>
          {(createHouse.isError || updateHouse.isError) && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={getErrorMessage(
                createHouse.error ?? updateHouse.error,
                "Failed to save house",
              )}
              lowContrast
              hideCloseButton
              style={{ marginBottom: "1rem", maxWidth: "100%" }}
            />
          )}
          <TextInput
            id="house-name"
            labelText="Name"
            placeholder="e.g. Vijaya"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched({ name: true })}
            invalid={!!touched.name && !name.trim()}
            invalidText="House name is required."
            style={{ marginBottom: "1rem" }}
          />
          <TextInput
            id="house-code"
            labelText="Short code (optional)"
            placeholder="e.g. VJ"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{ marginBottom: "1rem" }}
          />
          <div>
            <label htmlFor="house-color" style={{ fontSize: "0.75rem", display: "block", marginBottom: "0.5rem" }}>
              Color
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <input
                id="house-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={{ width: "3rem", height: "2.5rem", padding: 0, border: "1px solid #8d8d8d", cursor: "pointer" }}
              />
              <TextInput
                id="house-color-hex"
                labelText=""
                hideLabel
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={{ maxWidth: "8rem" }}
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={() => setModal(null)}>
            Cancel
          </Button>
          <Button
            kind="primary"
            onClick={handleSave}
            disabled={
              !name.trim() || createHouse.isPending || updateHouse.isPending
            }
          >
            {createHouse.isPending || updateHouse.isPending ? "Saving…" : "Save"}
          </Button>
        </ModalFooter>
      </ComposedModal>

      <ConfirmDeleteModal
        open={!!toDelete}
        title="Delete house"
        description={
          <>
            Delete <strong>{toDelete?.name}</strong>? This is blocked while a
            student or teacher is assigned to it.
          </>
        }
        isPending={deleteHouse.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
