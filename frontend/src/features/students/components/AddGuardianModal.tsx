import { useState } from "react";
import { Button, TextInput, Select, SelectItem, InlineNotification, ComposedModal, ModalHeader, ModalBody, ModalFooter } from "@carbon/react";
import { Search } from "@carbon/icons-react";
import { useAddGuardian, useSearchGuardians, useLinkGuardian } from "@/features/guardians/queries/useGuardians";
import { GUARDIAN_RELATIONSHIPS } from "@/features/guardians/constants";
import type { GuardianRelationship } from "@/features/guardians/api/guardian";
import { useDebounced } from "@/shared/hooks/useDebounced";
import { isValidSriLankanPhone, PHONE_INVALID_TEXT } from "@/shared/lib/phone";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";

const EMPTY_GUARDIAN_FORM = {
  full_name: "",
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
            setCreated({ name: result.guardian.full_name, duplicates: result.possible_duplicates.length });
          } else {
            onClose();
          }
        },
      },
    );
  };

  return (
    <ComposedModal open size="sm" onClose={onClose} aria-label={step === "search" ? "Add guardian" : "Create new guardian"}>
      <ModalHeader title={step === "search" ? "Add guardian" : "Create new guardian"} />
      <ModalBody>
        {created && (
          <InlineNotification
            kind="warning"
            title="Possible duplicate"
            subtitle={`${created.name} was added, but ${created.duplicates} existing guardian(s) share the same phone or email. Check the Guardians directory if this might be the same person.`}
            lowContrast
            hideCloseButton className="os-mb-4 os-max-w-full"
          />
        )}

        {step === "search" && !created && (
          <>
            <p className="os-text-sm os-c-secondary os-mt-0 os-mx-0 os-mb-4">
              Search first - siblings often share a guardian already on file.
            </p>
            <div className="os-search os-mb-4">
              <Search size={16} className="os-search__icon" />
              <input
                className="os-search__input"
                aria-label="Search guardians by name, phone, or email"
                placeholder="Search by name, phone, or email…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
            </div>

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
                      <div className="os-fw-600 os-text-sm">{g.full_name}</div>
                      <div className="os-text-xs os-c-tertiary">{g.phone}</div>
                    </div>
                    <Button size="sm" kind="tertiary" onClick={() => handleLink(g.id)} disabled={linkGuardian.isPending}>
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
              <TextInput
                id="guardian-name"
                labelText="Full name"
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
                {GUARDIAN_RELATIONSHIPS.map((r) => (
                  <SelectItem key={r.value} value={r.value} text={r.label} />
                ))}
              </Select>
              <TextInput
                id="guardian-phone"
                labelText="Phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                invalid={!!touched.phone && (!form.phone.trim() || !isValidSriLankanPhone(form.phone))}
                invalidText={form.phone.trim() ? PHONE_INVALID_TEXT : "A phone number is required."}
              />
              <TextInput
                id="guardian-email"
                labelText="Email (optional, needed to provision a portal login later)"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
              <TextInput
                id="guardian-nic"
                labelText="NIC number"
                value={form.nic_number}
                onChange={(e) => setForm((f) => ({ ...f, nic_number: e.target.value }))}
                onBlur={() => setTouched((t) => ({ ...t, nic_number: true }))}
                invalid={!!touched.nic_number && !form.nic_number.trim()}
                invalidText="NIC number is required."
                helperText="Used as the guardian's initial one-time portal password."
              />
            </div>
          </>
        )}
      </ModalBody>
      <ModalFooter>
        {created ? (
          <Button kind="primary" onClick={onClose}>
            Done
          </Button>
        ) : step === "search" ? (
          <>
            <Button kind="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button kind="tertiary" onClick={() => setStep("create")}>
              None of these - create new
            </Button>
          </>
        ) : (
          <>
            <Button kind="secondary" onClick={() => setStep("search")}>
              Back to search
            </Button>
            <Button kind="primary" onClick={handleAdd} disabled={!isValid || addGuardian.isPending}>
              {addGuardian.isPending ? "Adding…" : "Add guardian"}
            </Button>
          </>
        )}
      </ModalFooter>
    </ComposedModal>
  );
}
