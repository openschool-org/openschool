import { useState } from "react";
import { Segmented, Tabs } from "antd";
import type { StaffKind } from "@/features/attendance/api/staffAttendance";
import StaffRosterTable from "@/features/attendance/components/staff/StaffRosterTable";
import StaffMonthlyTable from "@/features/attendance/components/staff/StaffMonthlyTable";
import { todayISODate, formatDate } from "@/shared/lib/date";
import { useDebounced } from "@/shared/hooks/useDebounced";
import FilterBar from "@/shared/ui/FilterBar";
import DateField from "@/shared/ui/DateField";

const KINDS: { value: StaffKind; label: string }[] = [
  { value: "teacher", label: "Teachers" },
  { value: "staff", label: "Non-academic staff" },
];

// Server-paginated so a school with 100+ teachers pages through them instead of one long scroll.
export default function StaffAttendance() {
  const [date, setDate] = useState(todayISODate());
  const [showMonthly, setShowMonthly] = useState(false);
  const [kind, setKind] = useState<StaffKind>("teacher");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 250);

  const [year, month] = date.split("-").map(Number);
  const changeView = (monthly: boolean) => {
    setShowMonthly(monthly);
    if (monthly) setDate(`${date.slice(0, 7)}-01`);
  };

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Staff attendance</h1>
          <p className="os-page__subtitle">Mark daily staff attendance or view monthly summaries.</p>
        </div>
      </div>

      <div className="os-flex os-items-end os-gap-6 os-mb-6 os-wrap">
        <DateField value={date} onChange={(ymd) => ymd && setDate(ymd)} id="staff-attendance-date" labelText={showMonthly ? "Month" : "Date"} />
        <Segmented
          aria-label="Attendance view"
          value={showMonthly ? "monthly" : "daily"}
          onChange={(v) => changeView(v === "monthly")}
          options={[{ value: "daily", label: "Daily attendance" }, { value: "monthly", label: "Monthly summary" }]}
        />
        {!showMonthly && <span className="os-text-sm os-c-tertiary">{formatDate(date)}</span>}
      </div>

      <Tabs
        activeKey={kind}
        onChange={(k) => setKind(k as StaffKind)}
        aria-label="Staff type"
        items={KINDS.map((k) => ({ key: k.value, label: k.label }))}
      />

      <div className="os-mt-4">
        <FilterBar search={{ value: search, onChange: setSearch, placeholder: "Search by name or employee number" }} />
      </div>

      {showMonthly ? (
        <StaffMonthlyTable key={`${kind}-${debouncedSearch}`} year={year} month={month} kind={kind} search={debouncedSearch} />
      ) : (
        <StaffRosterTable key={`${kind}-${debouncedSearch}`} date={date} kind={kind} search={debouncedSearch} />
      )}
    </div>
  );
}
