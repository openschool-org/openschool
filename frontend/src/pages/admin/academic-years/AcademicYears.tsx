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
} from "@carbon/react";
import { AxiosError } from "axios";
import {
  useAcademicYears,
  useCreateAcademicYear,
  useSetCurrentAcademicYear,
  useDeleteAcademicYear,
} from "../../../queries/useAcademicYears";
import type { AcademicYear } from "../../../services/academicYear";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ErrorMessage from "../../../components/common/ErrorMessage";
import EmptyState from "../../../components/common/EmptyState";
import ConfirmDeleteModal from "../../../components/common/ConfirmDeleteModal";

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
  const [toDelete, setToDelete] = useState<AcademicYear | null>(null);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    createYear.reset();
    setCreateOpen(true);
  };

  const handleCreate = () => {
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

  const createError = createYear.isError
    ? (createYear.error as AxiosError<{ error: string }>).response?.data?.error ??
      "Failed to create academic year"
    : null;

  const isValid = form.label.trim() && form.start_date && form.end_date;

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

        {isLoading && <LoadingSpinner />}
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

        {years && years.length > 0 && (
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
          {createError && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={createError}
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
