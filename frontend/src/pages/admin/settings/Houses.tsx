import { useMemo, useState } from "react";
import { Add } from "@carbon/icons-react";
import {
  Button,
  TextInput,
  NumberInput,
  Tag,
  InlineNotification,
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@carbon/react";
import { AxiosError } from "axios";
import {
  useHouses,
  useCreateHouse,
  useUpdateHouse,
  useDeleteHouse,
  useReassignMissingHouses,
} from "../../../queries/useHouses";
import type { House } from "../../../services/house";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ErrorMessage from "../../../components/common/ErrorMessage";
import EmptyState from "../../../components/common/EmptyState";
import ConfirmDeleteModal from "../../../components/common/ConfirmDeleteModal";

function apiError(e: unknown, fallback: string) {
  return (e as AxiosError<{ error: string }>)?.response?.data?.error ?? fallback;
}

export default function Houses() {
  const { data: houses, isLoading, isError, refetch } = useHouses();
  const createHouse = useCreateHouse();
  const updateHouse = useUpdateHouse();
  const deleteHouse = useDeleteHouse();
  const reassign = useReassignMissingHouses();

  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<House | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [remainder, setRemainder] = useState(0);
  const [toDelete, setToDelete] = useState<House | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const count = houses?.length ?? 0;

  const ordered = useMemo(() => {
    if (!houses) return [];
    return [...houses].sort(
      (a, b) => a.remainder - b.remainder || a.name.localeCompare(b.name),
    );
  }, [houses]);

  const mappingIssues = useMemo(() => {
    if (count === 0) return [] as string[];
    const issues: string[] = [];
    const seen = new Map<number, number>();
    ordered.forEach((h) => seen.set(h.remainder, (seen.get(h.remainder) ?? 0) + 1));
    seen.forEach((n, r) => {
      if (r < 0 || r >= count) issues.push(`Remainder ${r} is outside 0–${count - 1}`);
      if (n > 1) issues.push(`Remainder ${r} is used by ${n} houses`);
    });
    for (let r = 0; r < count; r++) {
      if (!seen.has(r)) issues.push(`Remainder ${r} has no house`);
    }
    return issues;
  }, [ordered, count]);

  const openCreate = () => {
    createHouse.reset();
    setName("");
    setCode("");
    const used = new Set(ordered.map((h) => h.remainder));
    let next = 0;
    while (used.has(next)) next++;
    setRemainder(next);
    setEditing(null);
    setModal("create");
  };

  const openEdit = (h: House) => {
    updateHouse.reset();
    setName(h.name);
    setCode(h.code ?? "");
    setRemainder(h.remainder);
    setEditing(h);
    setModal("edit");
  };

  const handleSave = () => {
    const data = {
      name: name.trim(),
      code: code.trim() || undefined,
      remainder,
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
            A student is assigned by <strong>index number mod {count || "N"}</strong>
            {" "}(N = number of houses). Set which house each remainder maps to.
          </p>
        </div>
        <Button renderIcon={Add} kind="primary" size="md" onClick={openCreate}>
          Add House
        </Button>
      </div>

      {isLoading && <LoadingSpinner />}
      {isError && (
        <ErrorMessage message="Could not load houses." onRetry={refetch} />
      )}

      {deleteHouse.isError && (
        <InlineNotification
          kind="error"
          title="Could not delete house"
          subtitle={apiError(
            deleteHouse.error,
            "The house may be assigned to a student.",
          )}
          lowContrast
          onClose={() => deleteHouse.reset()}
          style={{ maxWidth: "100%", marginBottom: "1rem" }}
        />
      )}

      {!isLoading && !isError && mappingIssues.length > 0 && (
        <InlineNotification
          kind="warning"
          title="Remainder mapping needs attention"
          subtitle={mappingIssues.join(" · ")}
          lowContrast
          hideCloseButton
          style={{ maxWidth: "100%", marginBottom: "1rem" }}
        />
      )}

      {reassign.isSuccess && (
        <InlineNotification
          kind="success"
          title="Houses assigned"
          subtitle={`${reassign.data.assigned} student(s) without a house were assigned.`}
          lowContrast
          onClose={() => reassign.reset()}
          style={{ maxWidth: "100%", marginBottom: "1rem" }}
        />
      )}

      {reassign.isError && (
        <InlineNotification
          kind="error"
          title="Could not re-assign"
          subtitle={apiError(reassign.error, "Please try again.")}
          lowContrast
          onClose={() => reassign.reset()}
          style={{ maxWidth: "100%", marginBottom: "1rem" }}
        />
      )}

      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">Remainder mapping</h2>
          {houses && (
            <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>
              {houses.length} total
            </span>
          )}
        </div>

        {!isLoading && !isError && ordered.length === 0 && (
          <EmptyState
            title="No houses yet"
            description="Add the houses this school uses, giving each a remainder. Students are then assigned automatically by their index number."
            action={
              <Button renderIcon={Add} kind="primary" onClick={openCreate}>
                Add House
              </Button>
            }
          />
        )}

        {ordered.length > 0 && (
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
                  style={{
                    minWidth: "5.5rem",
                    fontSize: "0.75rem",
                    color: "#8d8d8d",
                  }}
                >
                  Remainder{" "}
                  <span style={{ color: "#406AAF", fontWeight: 600 }}>
                    {h.remainder}
                  </span>
                </span>

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
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Button
            kind="tertiary"
            size="md"
            disabled={reassign.isPending}
            onClick={() => reassign.mutate()}
          >
            {reassign.isPending
              ? "Assigning…"
              : "Re-assign all students without a house"}
          </Button>
          <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>
            Useful after setting up houses — students added earlier get a house.
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
              subtitle={apiError(
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
            style={{ marginBottom: "1rem" }}
          />
          <TextInput
            id="house-code"
            labelText="Short code / colour (optional)"
            placeholder="e.g. VJ or Blue"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{ marginBottom: "1rem" }}
          />
          <NumberInput
            id="house-remainder"
            label="Remainder"
            helperText={`index number mod ${Math.max(count, 1)} equals this value for students in this house (0 to ${Math.max(count, 1) - 1}).`}
            min={0}
            value={remainder}
            onChange={(_e, { value }) =>
              setRemainder(value === "" ? 0 : Number(value))
            }
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
            student is assigned to it.
          </>
        }
        isPending={deleteHouse.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
