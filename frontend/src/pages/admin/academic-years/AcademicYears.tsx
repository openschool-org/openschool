import { useState } from "react";
import { Calendar, Add, Checkmark } from "@carbon/icons-react";
import {
  Button,
  Tag,
  TextInput,
  Checkbox,
  DatePicker,
  DatePickerInput,
  InlineNotification,
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  SkeletonText,
} from "@carbon/react";
import {
  useAcademicYears,
  useCreateAcademicYear,
  useSetCurrentAcademicYear,
  useDeleteAcademicYear,
} from "../../../queries/useAcademicYears";
import type { AcademicYear } from "../../../services/academicYear";
import { getErrorMessage } from "../../../lib/errorMessage";
import ErrorMessage from "../../../components/common/ErrorMessage";
import EmptyState from "../../../components/common/EmptyState";
import ConfirmDeleteModal from "../../../components/common/ConfirmDeleteModal";

function AcademicYearRowSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "1.25rem 1.5rem",
        borderBottom: "1px solid #e0e0e0",
        gap: "1rem",
      }}
    >
      <SkeletonText width="1.25rem" />
      <div style={{ flex: 1 }}>
        <div style={{ marginBottom: "0.4rem" }}>
          <SkeletonText width="25%" />
        </div>
        <SkeletonText width="40%" />
      </div>
      <SkeletonText width="5rem" />
    </div>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-LK", {
    month: "short",
    year: "numeric",
  });
}

const EMPTY_FORM = {
  label: "",
  start_date: "",
  end_date: "",
  is_current: false,
};

export default function AcademicYears() {
  const { data: years, isLoading, isError, refetch } = useAcademicYears();
  const createYear = useCreateAcademicYear();
  const setCurrent = useSetCurrentAcademicYear();
  const deleteYear = useDeleteAcademicYear();

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [touched, setTouched] = useState<{ label?: boolean; start_date?: boolean; end_date?: boolean }>({});
  const [toDelete, setToDelete] = useState<AcademicYear | null>(null);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setTouched({});
    createYear.reset();
    setCreateOpen(true);
  };

  const dateRangeInvalid =
    !!form.start_date && !!form.end_date && form.end_date <= form.start_date;

  const isValid =
    form.label.trim().length > 0 &&
    !!form.start_date &&
    !!form.end_date &&
    !dateRangeInvalid;

  const handleCreate = () => {
    setTouched({ label: true, start_date: true, end_date: true });
    if (!isValid) return;
    createYear.mutate(
      {
        label: form.label.trim(),
        start_date: new Date(form.start_date).toISOString(),
        end_date: new Date(form.end_date).toISOString(),
        is_current: form.is_current,
      },
      { onSuccess: () => setCreateOpen(false) },
    );
  };

  const handleDelete = () => {
    if (!toDelete) return;
    deleteYear.mutate(toDelete.id, { onSettled: () => setToDelete(null) });
  };

  return (
    <div className="os-page">
      <div
        className="os-page__header"
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h1 className="os-page__title">Academic Years</h1>
          <p className="os-page__subtitle">
            Manage academic year periods for the school
          </p>
        </div>
        <Button renderIcon={Add} kind="primary" size="md" onClick={openCreate}>
          New Academic Year
        </Button>
      </div>

      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">Academic Years</h2>
          {years && (
            <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>
              {years.length} total
            </span>
          )}
        </div>

        {isLoading && (
          <div>
            {Array.from({ length: 3 }).map((_, i) => (
              <AcademicYearRowSkeleton key={i} />
            ))}
          </div>
        )}
        {isError && (
          <ErrorMessage
            message="Could not load academic years."
            onRetry={refetch}
          />
        )}

        {!isLoading && !isError && years?.length === 0 && (
          <EmptyState
            title="No academic years"
            description="Create the first academic year to get started."
          />
        )}

        {!isLoading && years && years.length > 0 && (
          <div>
            {years.map((y, i) => (
              <div
                key={y.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "1.25rem 1.5rem",
                  borderBottom:
                    i < years.length - 1 ? "1px solid #e0e0e0" : "none",
                  gap: "1rem",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#f4f4f4")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                <Calendar
                  size={20}
                  style={{
                    fill: y.is_current ? "#406AAF" : "#8d8d8d",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      margin: "0 0 0.125rem",
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      color: "#161616",
                    }}
                  >
                    {y.label}
                  </p>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "#525252" }}>
                    {formatDate(y.start_date)} — {formatDate(y.end_date)}
                  </p>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Tag type={y.is_current ? "teal" : "gray"} size="sm">
                    {y.is_current && (
                      <Checkmark size={12} style={{ marginRight: "4px" }} />
                    )}
                    {y.is_current ? "Current" : "Closed"}
                  </Tag>
                  {!y.is_current && (
                    <Button
                      kind="ghost"
                      size="sm"
                      onClick={() => setCurrent.mutate(y.id)}
                      disabled={setCurrent.isPending}
                    >
                      Set Current
                    </Button>
                  )}
                  {!y.is_current && (
                    <Button
                      kind="danger--ghost"
                      size="sm"
                      onClick={() => setToDelete(y)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      <ComposedModal
        open={createOpen}
        size="sm"
        onClose={() => setCreateOpen(false)}
      >
        <ModalHeader title="New academic year" />
        <ModalBody>
          {createYear.isError && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={getErrorMessage(createYear.error, "Failed to create academic year")}
              lowContrast
              hideCloseButton
              style={{ marginBottom: "1rem", maxWidth: "100%" }}
            />
          )}
          <div style={{ display: "grid", gap: "1rem" }}>
            <TextInput
              id="ay-label"
              labelText="Label"
              placeholder="e.g. 2026"
              value={form.label}
              onChange={(e) =>
                setForm((f) => ({ ...f, label: e.target.value }))
              }
              onBlur={() => setTouched((t) => ({ ...t, label: true }))}
              invalid={!!touched.label && !form.label.trim()}
              invalidText="A label is required."
            />
            <DatePicker
              datePickerType="single"
              dateFormat="Y-m-d"
              value={form.start_date}
              onChange={(dates) =>
                setForm((f) => ({ ...f, start_date: toYmd(dates[0]) }))
              }
            >
              <DatePickerInput
                id="ay-start"
                labelText="Start Date"
                placeholder="YYYY-MM-DD"
                onBlur={() => setTouched((t) => ({ ...t, start_date: true }))}
                invalid={!!touched.start_date && !form.start_date}
                invalidText="A start date is required."
              />
            </DatePicker>
            <DatePicker
              datePickerType="single"
              dateFormat="Y-m-d"
              value={form.end_date}
              onChange={(dates) =>
                setForm((f) => ({ ...f, end_date: toYmd(dates[0]) }))
              }
            >
              <DatePickerInput
                id="ay-end"
                labelText="End Date"
                placeholder="YYYY-MM-DD"
                onBlur={() => setTouched((t) => ({ ...t, end_date: true }))}
                invalid={!!touched.end_date && (!form.end_date || dateRangeInvalid)}
                invalidText={
                  dateRangeInvalid
                    ? "End date must be after the start date."
                    : "An end date is required."
                }
              />
            </DatePicker>
            <Checkbox
              id="ay-current"
              labelText="Set as current academic year"
              checked={form.is_current}
              onChange={(_e, { checked }) =>
                setForm((f) => ({ ...f, is_current: checked }))
              }
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
          <Button
            kind="primary"
            onClick={handleCreate}
            disabled={!isValid || createYear.isPending}
          >
            {createYear.isPending ? "Creating…" : "Create"}
          </Button>
        </ModalFooter>
      </ComposedModal>

      <ConfirmDeleteModal
        open={!!toDelete}
        title="Delete academic year"
        description={
          <>
            Delete <strong>{toDelete?.label}</strong>? This cannot be undone.
          </>
        }
        isPending={deleteYear.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function toYmd(d: Date | undefined): string {
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
