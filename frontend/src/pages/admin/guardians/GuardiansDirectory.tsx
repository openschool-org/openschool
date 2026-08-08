import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Search, Locked, UserMultiple, Edit, TrashCan } from "@carbon/icons-react";
import {
  Tag,
  SkeletonText,
  Button,
  TextInput,
  Select,
  SelectItem,
  Checkbox,
  InlineNotification,
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@carbon/react";
import {
  useGuardians,
  useSearchGuardians,
  useGuardianStudents,
  useGuardianNotifications,
  useUpdateGuardian,
  useDeleteGuardian,
} from "../../../queries/useGuardians";
import { GUARDIAN_RELATIONSHIPS } from "../../../services/guardian";
import type { Guardian, GuardianRelationship } from "../../../services/guardian";
import { getErrorMessage } from "../../../lib/errorMessage";
import EmptyState from "../../../components/common/EmptyState";
import ErrorMessage from "../../../components/common/ErrorMessage";
import ConfirmDeleteModal from "../../../components/common/ConfirmDeleteModal";

function relationshipLabel(value: string) {
  return GUARDIAN_RELATIONSHIPS.find((r) => r.value === value)?.label ?? value;
}

function EditGuardianModal({ guardian, onClose }: { guardian: Guardian; onClose: () => void }) {
  const updateGuardian = useUpdateGuardian();
  const [form, setForm] = useState({
    full_name: guardian.full_name,
    relationship: guardian.relationship,
    phone: guardian.phone,
    email: guardian.email ?? "",
    nic_number: guardian.nic_number,
  });
  const [touched, setTouched] = useState<{
    full_name?: boolean;
    phone?: boolean;
    nic_number?: boolean;
  }>({});

  const isValid =
    form.full_name.trim().length > 0 &&
    form.phone.trim().length > 0 &&
    form.nic_number.trim().length > 0;

  const handleSave = () => {
    setTouched({ full_name: true, phone: true, nic_number: true });
    if (!isValid) return;
    updateGuardian.mutate(
      {
        id: guardian.id,
        data: {
          full_name: form.full_name.trim(),
          relationship: form.relationship,
          phone: form.phone.trim(),
          email: form.email.trim() || undefined,
          nic_number: form.nic_number.trim(),
        },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <ComposedModal open size="sm" onClose={onClose}>
      <ModalHeader title="Edit guardian" />
      <ModalBody>
        {updateGuardian.isError && (
          <InlineNotification
            kind="error"
            title="Error"
            subtitle={getErrorMessage(updateGuardian.error, "Failed to update guardian")}
            lowContrast
            hideCloseButton
            style={{ marginBottom: "1rem", maxWidth: "100%" }}
          />
        )}
        <div style={{ display: "grid", gap: "1rem" }}>
          <TextInput
            id="edit-guardian-name"
            labelText="Full Name"
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            onBlur={() => setTouched((t) => ({ ...t, full_name: true }))}
            invalid={!!touched.full_name && !form.full_name.trim()}
            invalidText="A name is required."
          />
          <Select
            id="edit-guardian-relationship"
            labelText="Relationship"
            value={form.relationship}
            onChange={(e) =>
              setForm((f) => ({ ...f, relationship: e.target.value as GuardianRelationship }))
            }
          >
            {GUARDIAN_RELATIONSHIPS.map((r) => (
              <SelectItem key={r.value} value={r.value} text={r.label} />
            ))}
          </Select>
          <TextInput
            id="edit-guardian-phone"
            labelText="Phone"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
            invalid={!!touched.phone && !form.phone.trim()}
            invalidText="A phone number is required."
          />
          <TextInput
            id="edit-guardian-email"
            labelText="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <TextInput
            id="edit-guardian-nic"
            labelText="NIC Number"
            value={form.nic_number}
            onChange={(e) => setForm((f) => ({ ...f, nic_number: e.target.value }))}
            onBlur={() => setTouched((t) => ({ ...t, nic_number: true }))}
            invalid={!!touched.nic_number && !form.nic_number.trim()}
            invalidText="NIC number is required."
          />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button kind="primary" onClick={handleSave} disabled={!isValid || updateGuardian.isPending}>
          {updateGuardian.isPending ? "Saving…" : "Save"}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
}

function GuardianDetail({
  guardian,
  onDeleted,
}: {
  guardian: Guardian;
  onDeleted: () => void;
}) {
  const { data: students, isLoading: studentsLoading } = useGuardianStudents(guardian.id);
  const { data: notifications, isLoading: notificationsLoading } = useGuardianNotifications(guardian.id);
  const deleteGuardian = useDeleteGuardian();

  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const hasStudents = (students?.length ?? 0) > 0;

  return (
    <div className="os-section" style={{ marginTop: 0 }}>
      <div className="os-section__header">
        <h2 className="os-section__title">{guardian.full_name}</h2>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <Tag size="sm" type="gray">
            {relationshipLabel(guardian.relationship)}
          </Tag>
          {guardian.user_id ? (
            <Tag size="sm" type="green">
              <Locked size={12} style={{ marginRight: "4px" }} />
              Portal access
            </Tag>
          ) : (
            <Tag size="sm" type="cool-gray">
              No portal login
            </Tag>
          )}
          <Button renderIcon={Edit} kind="ghost" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button
            renderIcon={TrashCan}
            kind="danger--ghost"
            size="sm"
            onClick={() => {
              deleteGuardian.reset();
              setConfirmDelete(true);
            }}
          >
            Delete
          </Button>
        </div>
      </div>
      <div className="os-section__body">
        {deleteGuardian.isError && (
          <InlineNotification
            kind="error"
            title="Could not delete guardian"
            subtitle={getErrorMessage(
              deleteGuardian.error,
              "This guardian may still be linked to a student.",
            )}
            lowContrast
            onClose={() => deleteGuardian.reset()}
            style={{ marginBottom: "1rem", maxWidth: "100%" }}
          />
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <p style={{ margin: "0 0 0.15rem", fontSize: "0.75rem", color: "#8d8d8d" }}>Phone</p>
            <p style={{ margin: 0, fontSize: "0.875rem" }}>{guardian.phone}</p>
          </div>
          <div>
            <p style={{ margin: "0 0 0.15rem", fontSize: "0.75rem", color: "#8d8d8d" }}>Email</p>
            <p style={{ margin: 0, fontSize: "0.875rem" }}>{guardian.email || "—"}</p>
          </div>
        </div>

        <h3 style={{ fontSize: "0.8125rem", fontWeight: 600, margin: "0 0 0.75rem" }}>Linked students</h3>
        {studentsLoading ? (
          <SkeletonText width="60%" />
        ) : students && students.length > 0 ? (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
            {students.map((s) => (
              <Link
                key={s.id}
                to={`/students/${s.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  padding: "0.375rem 0.75rem",
                  border: "1px solid #e0e0e0",
                  fontSize: "0.8125rem",
                  textDecoration: "none",
                  color: "#161616",
                }}
              >
                <UserMultiple size={14} style={{ fill: "#406AAF" }} />
                {s.full_name}
              </Link>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: "0.8125rem", color: "#8d8d8d", marginBottom: "1.5rem" }}>No students linked.</p>
        )}

        <h3 style={{ fontSize: "0.8125rem", fontWeight: 600, margin: "0 0 0.75rem" }}>Notification history</h3>
        {!guardian.user_id ? (
          <p style={{ fontSize: "0.8125rem", color: "#8d8d8d" }}>
            This guardian has no portal login, so they haven't received any in-app notifications.
          </p>
        ) : notificationsLoading ? (
          <SkeletonText width="80%" />
        ) : notifications && notifications.length > 0 ? (
          <div>
            {notifications.slice(0, 20).map((n) => (
              <div key={n.recipient_id} style={{ padding: "0.625rem 0", borderBottom: "1px solid #f4f4f4" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontWeight: 600, fontSize: "0.8125rem" }}>{n.title}</span>
                  <Tag size="sm" type="cool-gray">
                    {n.category}
                  </Tag>
                  <div style={{ flex: 1 }} />
                  <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>
                    {new Date(n.sent_at).toLocaleString()}
                  </span>
                </div>
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem", color: "#525252" }}>{n.message}</p>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: "0.8125rem", color: "#8d8d8d" }}>No notifications sent yet.</p>
        )}
      </div>

      {editing && <EditGuardianModal guardian={guardian} onClose={() => setEditing(false)} />}

      <ConfirmDeleteModal
        open={confirmDelete}
        title="Delete guardian"
        description={
          hasStudents ? (
            <>
              <strong>{guardian.full_name}</strong> is still linked to {students?.length} student
              {students && students.length !== 1 ? "s" : ""}. Unlink them from this guardian first
              (from each student's profile), then delete.
            </>
          ) : (
            <>
              Delete <strong>{guardian.full_name}</strong>? This cannot be undone.
            </>
          )
        }
        isPending={deleteGuardian.isPending}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (hasStudents) {
            setConfirmDelete(false);
            return;
          }
          deleteGuardian.mutate(guardian.id, {
            onSuccess: () => {
              setConfirmDelete(false);
              onDeleted();
            },
          });
        }}
      />
    </div>
  );
}

export default function GuardiansDirectory() {
  const [search, setSearch] = useState("");
  const [orphansOnly, setOrphansOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const allGuardians = useGuardians(orphansOnly);
  const searchResults = useSearchGuardians(search, orphansOnly);
  const isSearching = search.trim().length > 0;

  const { data: guardians, isLoading, isError, refetch } = isSearching ? searchResults : allGuardians;

  const ordered = useMemo(() => {
    if (!guardians) return [];
    return [...guardians].sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [guardians]);

  const selected = ordered.find((g) => g.id === selectedId) ?? null;

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Guardians</h1>
          <p className="os-page__subtitle">
            Every guardian on file — search by name, phone, or email. One
            guardian can be linked to multiple students (siblings share a
            record instead of duplicating it).
          </p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <div className="os-search" style={{ maxWidth: "24rem" }}>
          <Search size={16} className="os-search__icon" />
          <input
            className="os-search__input"
            placeholder="Search guardians…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Checkbox
          id="orphans-only"
          labelText="Orphans only — linked to no student"
          checked={orphansOnly}
          onChange={(_e, { checked }) => setOrphansOnly(checked)}
        />
      </div>

      {isError && <ErrorMessage message="Could not load guardians." onRetry={refetch} />}

      <div style={{ display: "grid", gridTemplateColumns: "20rem 1fr", gap: "1.5rem", alignItems: "start" }}>
        <div className="os-section" style={{ marginTop: 0 }}>
          {isLoading && (
            <div>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ padding: "0.875rem 1.5rem", borderBottom: "1px solid #e0e0e0" }}>
                  <SkeletonText width="70%" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && !isError && ordered.length === 0 && (
            <EmptyState
              title={isSearching ? "No matches" : "No guardians yet"}
              description={
                isSearching
                  ? "Try a different name, phone number, or email."
                  : "Guardians are added from a student's profile."
              }
            />
          )}

          {!isLoading &&
            ordered.map((g, i) => (
              <button
                key={g.id}
                onClick={() => setSelectedId(g.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "0.875rem 1.5rem",
                  border: "none",
                  borderBottom: i < ordered.length - 1 ? "1px solid #e0e0e0" : "none",
                  background: selected?.id === g.id ? "#edf5ff" : "transparent",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#161616" }}>{g.full_name}</div>
                <div style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>
                  {relationshipLabel(g.relationship)} · {g.phone}
                </div>
              </button>
            ))}
        </div>

        {selected ? (
          <GuardianDetail guardian={selected} onDeleted={() => setSelectedId(null)} />
        ) : (
          <div className="os-section" style={{ marginTop: 0 }}>
            <EmptyState title="Select a guardian" description="Pick a guardian from the list to see their details." />
          </div>
        )}
      </div>
    </div>
  );
}
