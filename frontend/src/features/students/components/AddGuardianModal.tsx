import { useState } from "react";
import { Alert, Button, Input, Modal } from "antd";
import SelectField from "@/shared/ui/SelectField";
import TextField from "@/shared/ui/TextField";
import { SearchOutlined } from "@ant-design/icons";
import { useAddGuardian, useSearchGuardians, useLinkGuardian } from "@/features/guardians/queries/useGuardians";
import { GUARDIAN_RELATIONSHIPS } from "@/features/guardians/constants";
import type { GuardianRelationship } from "@/features/guardians/api/guardian";
import { useDebounced } from "@/shared/hooks/useDebounced";
import { isValidSriLankanPhone, PHONE_INVALID_TEXT } from "@/shared/lib/phone";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import PersonNameFields from "@/shared/ui/PersonNameFields";
import { displayName } from "@/shared/lib/name";

const EMPTY_GUARDIAN_FORM = {
  full_name: "",
  name_with_initials: "",
  calling_name: "",
  relationship: "father" as GuardianRelationship,
  phone: "",
  email: "",
  nic_number: "",
};

export default function AddGuardianModal({
  studentId,
  existingGuardianIds,
  onClose,
}: {
  studentId: string;
  existingGuardianIds: string[];
  onClose: () => void;
}) {
  const [step, setStep] = useState<"search" | "create">("search");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query, 300);
  const search = useSearchGuardians(debouncedQuery);
  const linkGuardian = useLinkGuardian(studentId);

  const addGuardian = useAddGuardian(studentId);
  const [form, setForm] = useState(EMPTY_GUARDIAN_FORM);
  const [touched, setTouched] = useState<{
    full_name?: boolean;
    phone?: boolean;
    nic_number?: boolean;
  }>({});
  const [created, setCreated] = useState<{ name: string; duplicates: number } | null>(null);

  const isValid =
    form.full_name.trim().length > 0 &&
    form.phone.trim().length > 0 &&
    isValidSriLankanPhone(form.phone) &&
    form.nic_number.trim().length > 0;

  const results = (search.data?.items ?? []).filter((g) => !existingGuardianIds.includes(g.id));

  const handleLink = (guardianId: string) => {
    linkGuardian.mutate({ guardianId, isPrimaryContact: false }, { onSuccess: onClose });
  };

  const handleAdd = () => {
    setTouched({ full_name: true, phone: true, nic_number: true });
    if (!isValid) return;
    addGuardian.mutate(
      {
        data: {
          full_name: form.full_name.trim(),
          name_with_initials: form.name_with_initials.trim() || undefined,
          calling_name: form.calling_name.trim() || undefined,
          relationship: form.relationship,
          phone: form.phone.trim(),
          email: form.email.trim() || undefined,
          nic_number: form.nic_number.trim(),
        },
        isPrimaryContact: false,
      },
      {
        onSuccess: (result) => {
          if (result.possible_duplicates.length > 0) {
            // Created and linked, but a matching phone or email exists; surface it instead of closing silently.
            setCreated({ name: displayName(result.guardian), duplicates: result.possible_duplicates.length });
          } else {
            onClose();
          }
        },
      },
    );
  };

  const footer =
    created ? (
      <Button type="primary" onClick={onClose}>
        Done
      </Button>
    ) : step === "search" ? (
      <>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => setStep("create")}>
          None of these - create new
        </Button>
      </>
    ) : (
      <>
        <Button onClick={() => setStep("search")}>
          Back to search
        </Button>
        <Button type="primary" onClick={handleAdd} disabled={!isValid} loading={addGuardian.isPending}>
          {addGuardian.isPending ? "Adding…" : "Add guardian"}
        </Button>
      </>
    );

  return (
    <Modal
      open
      width={520}
      onCancel={onClose}
      title={step === "search" ? "Add guardian" : "Create new guardian"}
      footer={footer}
    >
        {created && (
          <Alert
            type="warning"
            showIcon
            title="Possible duplicate"
            description={`${created.name} was added, but ${created.duplicates} existing guardian(s) share the same phone or email. Check the Guardians directory if this might be the same person.`}
            className="os-mb-4"
          />
        )}

        {step === "search" && !created && (
          <>
            <p className="os-text-sm os-c-secondary os-mt-0 os-mx-0 os-mb-4">
              Search first - siblings often share a guardian already on file.
            </p>
            <Input
              className="os-mb-4"
              allowClear
              prefix={<SearchOutlined />}
              aria-label="Search guardians by name, phone, or email"
              placeholder="Search by name, phone, or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />

            {query.trim().length > 0 && (
              <div className="os-grid os-gap-2 os-mb-4">
                {results.length === 0 && !search.isLoading && (
                  <p className="os-text-sm os-c-tertiary">No matching guardians found.</p>
                )}
                {results.map((g) => (
                  <div
                    key={g.id} className="os-flex os-items-center os-justify-between os-py-2h os-px-3h os-border"
                  >
                    <div>
                      <div className="os-fw-600 os-text-sm">{displayName(g)}</div>
                      <div className="os-text-xs os-c-tertiary">{g.phone}</div>
                    </div>
                    <Button onClick={() => handleLink(g.id)} disabled={linkGuardian.isPending}>
                      Link
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <MutationErrorNotification
              isError={linkGuardian.isError}
              error={linkGuardian.error}
              title="Could not link guardian" fallback="Please try again." className="os-mb-4"
            />
          </>
        )}

        {step === "create" && !created && (
          <>
            <MutationErrorNotification
              isError={addGuardian.isError}
              error={addGuardian.error}
              title="Could not add guardian" fallback="Please try again." className="os-mb-4"
            />
            <div className="os-grid os-gap-4">
<PersonNameFields
          idPrefix="guardian"
          value={form}
          onChange={(next) => setForm((f) => ({ ...f, ...next }))}
          fullNameInvalid={!!touched.full_name && !form.full_name.trim()}
          onFullNameBlur={() => setTouched((t) => ({ ...t, full_name: true }))}
        />
              <SelectField
                id="guardian-relationship"
                label="Relationship"
                value={form.relationship}
                onChange={(v) => setForm((f) => ({ ...f, relationship: v as GuardianRelationship }))}
                options={GUARDIAN_RELATIONSHIPS}
              />
              <TextField
                id="guardian-phone"
                label="Phone"
                value={form.phone}
                onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                invalid={!!touched.phone && (!form.phone.trim() || !isValidSriLankanPhone(form.phone))}
                invalidText={form.phone.trim() ? PHONE_INVALID_TEXT : "A phone number is required."}
              />
              <TextField
                id="guardian-email"
                label="Email (optional, needed to provision a portal login later)"
                type="email"
                value={form.email}
                onChange={(v) => setForm((f) => ({ ...f, email: v }))}
              />
              <TextField
                id="guardian-nic"
                label="NIC number"
                value={form.nic_number}
                onChange={(v) => setForm((f) => ({ ...f, nic_number: v }))}
                onBlur={() => setTouched((t) => ({ ...t, nic_number: true }))}
                invalid={!!touched.nic_number && !form.nic_number.trim()}
                invalidText="NIC number is required."
                helperText="Used as the guardian's initial one-time portal password."
              />
            </div>
          </>
        )}
    </Modal>
  );
}
