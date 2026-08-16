import { Calendar, Checkmark } from "@carbon/icons-react";
import { Button, Tag } from "@carbon/react";
import type { useAcademicYears, useSetCurrentAcademicYear } from "../../../../queries/useAcademicYears";
import type { AcademicYear } from "../../../../services/academicYear";
import ErrorMessage from "../../../../components/common/ErrorMessage";
import EmptyState from "../../../../components/common/EmptyState";
import AcademicYearRowSkeleton from "./AcademicYearRowSkeleton";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  // start_date/end_date are PG DATE-only ("YYYY-MM-DD", no time/offset).
  // new Date(iso) parses that as UTC midnight, which toLocaleDateString
  // then renders in the browser's local zone — shifting to the previous
  // day in any negative-UTC-offset timezone. Building the Date from the
  // parsed Y/M/D components (as a local date) avoids that entirely.
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-LK", {
    month: "short",
    year: "numeric",
  });
}

interface Props {
  years: ReturnType<typeof useAcademicYears>["data"];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  setCurrent: ReturnType<typeof useSetCurrentAcademicYear>;
  onOpenTerms: (year: AcademicYear) => void;
  onRequestDelete: (year: AcademicYear) => void;
}

export default function YearsList({
  years,
  isLoading,
  isError,
  refetch,
  setCurrent,
  onOpenTerms,
  onRequestDelete,
}: Props) {
  return (
    <div className="os-section">
      <div className="os-section__header">
        <h2 className="os-section__title">Academic Years</h2>
        {years && <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>{years.length} total</span>}
      </div>

      {isLoading && (
        <div>
          {Array.from({ length: 3 }).map((_, i) => (
            <AcademicYearRowSkeleton key={i} />
          ))}
        </div>
      )}
      {isError && <ErrorMessage message="Could not load academic years." onRetry={refetch} />}

      {!isLoading && !isError && years?.length === 0 && (
        <EmptyState title="No academic years" description="Create the first academic year to get started." />
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
                borderBottom: i < years.length - 1 ? "1px solid #e0e0e0" : "none",
                gap: "1rem",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f4f4f4")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <Calendar size={20} style={{ fill: y.is_current ? "#406AAF" : "#8d8d8d", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ margin: "0 0 0.125rem", fontWeight: 600, fontSize: "0.9rem", color: "#161616" }}>
                  {y.label}
                </p>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#525252" }}>
                  {formatDate(y.start_date)} — {formatDate(y.end_date)}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Tag type={y.is_current ? "teal" : "gray"} size="sm">
                  {y.is_current && <Checkmark size={12} style={{ marginRight: "4px" }} />}
                  {y.is_current ? "Current" : "Closed"}
                </Tag>
                <Button kind="ghost" size="sm" onClick={() => onOpenTerms(y)}>
                  Terms
                </Button>
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
                  <Button kind="danger--ghost" size="sm" onClick={() => onRequestDelete(y)}>
                    Delete
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
