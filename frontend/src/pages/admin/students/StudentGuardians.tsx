import { useState } from "react";
import {
  Button,
  Tag,
  TextInput,
  PasswordInput,
  Select,
  SelectItem,
  InlineNotification,
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@carbon/react";
import { Add, UserFollow, Locked } from "@carbon/icons-react";
import {
  useGuardiansByStudent,
  useAddGuardian,
  useUnlinkGuardian,
  useSetPrimaryGuardian,
  useProvisionGuardianLogin,
} from "../../../queries/useGuardians";
import type { GuardianRelationship, GuardianWithPrimary } from "../../../services/guardian";
import { getErrorMessage } from "../../../lib/errorMessage";
import EmptyState from "../../../components/common/EmptyState";
import ConfirmDeleteModal from "../../../components/common/ConfirmDeleteModal";

// A student can have at most 2 guardians on file.
const MAX_GUARDIANS = 2;

const RELATIONSHIPS: { value: GuardianRelationship; label: string }[] = [
  { value: "father", label: "Father" },
  { value: "mother", label: "Mother" },
  { value: "guardian", label: "Guardian" },
  { value: "other", label: "Other" },
];

const EMPTY_GUARDIAN_FORM = {
  full_name: "",
  relationship: "father" as GuardianRelationship,
  phone: "",
  email: "",
};

const EMPTY_LOGIN_FORM = { given_name: "", family_name: "", username: "", password: "" };

function AddGuardianModal({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const addGuardian = useAddGuardian(studentId);
  const [form, setForm] = useState(EMPTY_GUARDIAN_FORM);
  const [touched, setTouched] = useState<{ full_name?: boolean; phone?: boolean }>({});

  const isValid = form.full_name.trim().length > 0 && form.phone.trim().length > 0;

  const handleAdd = () => {
    setTouched({ full_name: true, phone: true });
    if (!isValid) return;
    addGuardian.mutate(
      {
        data: {
          full_name: form.full_name.trim(),
          relationship: form.relationship,
          phone: form.phone.trim(),
          email: form.email.trim() || undefined,
        },
        isPrimaryContact: false,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <ComposedModal open size="sm" onClose={onClose}>
      <ModalHeader title="Add guardian" />
      <ModalBody>
        {addGuardian.isError && (
          <InlineNotification
            kind="error"
            title="Error"
            subtitle={getErrorMessage(addGuardian.error, "Failed to add guardian")}
            lowContrast
            hideCloseButton
            style={{ marginBottom: "1rem", maxWidth: "100%" }}
          />
        )}
        <div style={{ display: "grid", gap: "1rem" }}>
          <TextInput
            id="guardian-name"
            labelText="Full Name"
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            onBlur={() => setTouched((t) => ({ ...t, full_name: true }))}
            invalid={!!touched.full_name && !form.full_name.trim()}
            invalidText="A name is required."
          />
          <Select
            id="guardian-relationship"
            labelText="Relationship"
            value={form.relationship}
            onChange={(e) =>
              setForm((f) => ({ ...f, relationship: e.target.value as GuardianRelationship }))
            }
          >
            {RELATIONSHIPS.map((r) => (
              <SelectItem key={r.value} value={r.value} text={r.label} />
            ))}
          </Select>
          <TextInput
            id="guardian-phone"
            labelText="Phone"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
            invalid={!!touched.phone && !form.phone.trim()}
            invalidText="A phone number is required."
          />
          <TextInput
            id="guardian-email"
            labelText="Email (optional, needed to provision a portal login later)"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button kind="primary" onClick={handleAdd} disabled={!isValid || addGuardian.isPending}>
          {addGuardian.isPending ? "Adding…" : "Add Guardian"}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
}

function ProvisionLoginModal({
  studentId,
  guardian,
  onClose,
}: {
  studentId: string;
  guardian: GuardianWithPrimary;
  onClose: () => void;
}) {
  const provision = useProvisionGuardianLogin(studentId);
  const [form, setForm] = useState(() => {
    const [given, ...rest] = guardian.full_name.trim().split(/\s+/);
    return { ...EMPTY_LOGIN_FORM, given_name: given ?? "", family_name: rest.join(" ") };
  });
  const [touched, setTouched] = useState<Record<keyof typeof EMPTY_LOGIN_FORM, boolean>>({
    given_name: false,
    family_name: false,
    username: false,
    password: false,
  });

  const isValid =
    form.given_name.trim().length > 0 &&
    form.family_name.trim().length > 0 &&
    form.username.trim().length > 0 &&
    form.password.length >= 8;

  const handleSubmit = () => {
    setTouched({ given_name: true, family_name: true, username: true, password: true });
    if (!isValid) return;
    provision.mutate(
      {
        guardianId: guardian.id,
        data: {
          given_name: form.given_name.trim(),
          family_name: form.family_name.trim(),
          username: form.username.trim(),
          password: form.password,
        },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <ComposedModal open size="sm" onClose={onClose}>
      <ModalHeader title={`Set up portal login — ${guardian.full_name}`} />
      <ModalBody>
        {!guardian.email && (
          <InlineNotification
            kind="warning"
            title="No email on file"
            subtitle="This guardian needs an email address before a login can be provisioned. Edit their details first."
            lowContrast
            hideCloseButton
            style={{ marginBottom: "1rem", maxWidth: "100%" }}
          />
        )}
        {provision.isError && (
          <InlineNotification
            kind="error"
            title="Error"
            subtitle={getErrorMessage(provision.error, "Failed to create login")}
            lowContrast
            hideCloseButton
            style={{ marginBottom: "1rem", maxWidth: "100%" }}
          />
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <TextInput
            id="guardian-login-given-name"
            labelText="First Name"
            value={form.given_name}
            onChange={(e) => setForm((f) => ({ ...f, given_name: e.target.value }))}
            onBlur={() => setTouched((t) => ({ ...t, given_name: true }))}
            invalid={touched.given_name && !form.given_name.trim()}
            invalidText="Required."
          />
          <TextInput
            id="guardian-login-family-name"
            labelText="Last Name"
            value={form.family_name}
            onChange={(e) => setForm((f) => ({ ...f, family_name: e.target.value }))}
            onBlur={() => setTouched((t) => ({ ...t, family_name: true }))}
            invalid={touched.family_name && !form.family_name.trim()}
            invalidText="Required."
          />
        </div>
        <div style={{ marginTop: "1rem", display: "grid", gap: "1rem" }}>
          <TextInput
            id="guardian-login-username"
            labelText="Username"
            helperText="What this guardian signs in with — separate from their email."
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            onBlur={() => setTouched((t) => ({ ...t, username: true }))}
            invalid={touched.username && !form.username.trim()}
            invalidText="Required."
          />
          <PasswordInput
            id="guardian-login-password"
            labelText="Temporary Password"
            helperText="At least 8 characters. Share this with the guardian directly."
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            invalid={touched.password && form.password.length < 8}
            invalidText="Must be at least 8 characters."
          />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          kind="primary"
          onClick={handleSubmit}
          disabled={!isValid || !guardian.email || provision.isPending}
        >
          {provision.isPending ? "Creating…" : "Create Login"}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
}

export default function StudentGuardians({ studentId }: { studentId: string }) {
  const { data: guardians, isLoading } = useGuardiansByStudent(studentId);
  const unlinkGuardian = useUnlinkGuardian(studentId);
  const setPrimary = useSetPrimaryGuardian(studentId);

  const [addOpen, setAddOpen] = useState(false);
  const [loginFor, setLoginFor] = useState<GuardianWithPrimary | null>(null);
  const [toUnlink, setToUnlink] = useState<GuardianWithPrimary | null>(null);

  const atMax = (guardians?.length ?? 0) >= MAX_GUARDIANS;

  return (
    <div className="os-section">
      <div className="os-section__header">
        <h2 className="os-section__title">Guardians</h2>
        <Button
          renderIcon={Add}
          kind="ghost"
          size="sm"
          onClick={() => setAddOpen(true)}
          disabled={atMax}
        >
          Add Guardian
        </Button>
      </div>
      <div className="os-section__body">
        {atMax && (
          <p style={{ margin: "0 0 1rem", fontSize: "0.75rem", color: "#8d8d8d" }}>
            A student can have at most {MAX_GUARDIANS} guardians on file. Remove one to add another.
          </p>
        )}

        {!isLoading && guardians?.length === 0 && (
          <EmptyState
            title="No guardians yet"
            description="Every student needs at least one guardian on file."
          />
        )}

        {!isLoading && guardians && guardians.length > 0 && (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {guardians.map((g) => (
              <div
                key={g.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "0.875rem 1rem",
                  border: "1px solid #e0e0e0",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: "0.875rem", color: "#161616" }}>
                      {g.full_name}
                    </p>
                    <Tag size="sm" type="gray">
                      {RELATIONSHIPS.find((r) => r.value === g.relationship)?.label ?? g.relationship}
                    </Tag>
                    {g.is_primary_contact && (
                      <Tag size="sm" type="teal">
                        Primary contact
                      </Tag>
                    )}
                    {g.user_id && (
                      <Tag size="sm" type="green">
                        <Locked size={12} style={{ marginRight: "4px" }} />
                        Portal access
                      </Tag>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: "0.8125rem", color: "#525252" }}>
                    {g.phone}
                    {g.email ? ` · ${g.email}` : ""}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                  {!g.is_primary_contact && (
                    <Button
                      kind="ghost"
                      size="sm"
                      onClick={() => setPrimary.mutate(g.id)}
                      disabled={setPrimary.isPending}
                    >
                      Set Primary
                    </Button>
                  )}
                  {!g.user_id && (
                    <Button
                      renderIcon={UserFollow}
                      kind="ghost"
                      size="sm"
                      onClick={() => setLoginFor(g)}
                    >
                      Set Up Login
                    </Button>
                  )}
                  <Button kind="danger--ghost" size="sm" onClick={() => setToUnlink(g)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {addOpen && <AddGuardianModal studentId={studentId} onClose={() => setAddOpen(false)} />}
      {loginFor && (
        <ProvisionLoginModal
          studentId={studentId}
          guardian={loginFor}
          onClose={() => setLoginFor(null)}
        />
      )}

      <ConfirmDeleteModal
        open={!!toUnlink}
        title="Remove guardian"
        description={
          <>
            Remove <strong>{toUnlink?.full_name}</strong> from this student? Their guardian
            record isn't deleted — this only unlinks them from this student.
          </>
        }
        isPending={unlinkGuardian.isPending}
        onClose={() => setToUnlink(null)}
        onConfirm={() => {
          if (toUnlink) unlinkGuardian.mutate(toUnlink.id, { onSettled: () => setToUnlink(null) });
        }}
      />
    </div>
  );
}
