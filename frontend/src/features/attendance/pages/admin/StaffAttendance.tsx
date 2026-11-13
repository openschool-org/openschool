import { useState } from "react";
import { Segmented } from "antd";
import type { StaffKind } from "@/features/attendance/api/staffAttendance";
import StaffRosterTable from "@/features/attendance/components/staff/StaffRosterTable";
import StaffMonthlyTable from "@/features/attendance/components/staff/StaffMonthlyTable";
import { formatMonth, todayISODate } from "@/shared/lib/date";
import { useDebounced } from "@/shared/hooks/useDebounced";
import FilterBar from "@/shared/ui/FilterBar";
import DateField from "@/shared/ui/DateField";
import SelectField from "@/shared/ui/SelectField";

const KINDS: { value: StaffKind; label: string }[] = [
  { value: "teacher", label: "Teachers" },
  { value: "staff", label: "Non-academic staff" },
];

// The last 24 months, newest first, as "YYYY-MM-01" values.
const MONTHS = Array.from({ length: 24 }, (_, i) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - i);
  const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  return { value, label: formatMonth(value) };
});

// One card: staff type + search on top, then the day roster or the month summary. Server-paginated for large staffs.
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
          <p className="os-page__subtitle">Mark today's attendance or review a month at a glance.</p>
        </div>
        <div className="os-flex os-items-center os-gap-3 os-wrap">
          <Segmented
            aria-label="Attendance view"
            value={showMonthly ? "monthly" : "daily"}
            onChange={(v) => changeView(v === "monthly")}
            options={[{ value: "daily", label: "Daily" }, { value: "monthly", label: "Monthly" }]}
          />
          <div className="os-att-date">
            {showMonthly ? (
              <SelectField id="staff-attendance-month" label="Month" hideLabel value={date} onChange={setDate} options={MONTHS} />
            ) : (
              <DateField id="staff-attendance-date" labelText="Date" hideLabel value={date} onChange={(ymd) => ymd && setDate(ymd)} />
            )}
          </div>
        </div>
      </div>

      <div className="os-section">
        <div className="os-att-toolbar">
          <Segmented aria-label="Staff type" value={kind} onChange={(v) => { setKind(v as StaffKind); setSearch(""); }} options={KINDS} />
          <div className="os-att-toolbar__search">
            <FilterBar search={{ value: search, onChange: setSearch, placeholder: "Search by name or employee number" }} />
          </div>
        </div>
        {showMonthly ? (
          <StaffMonthlyTable key={`${kind}-${debouncedSearch}`} year={year} month={month} kind={kind} search={debouncedSearch} />
        ) : (
          <StaffRosterTable key={`${kind}-${debouncedSearch}`} date={date} kind={kind} search={debouncedSearch} />
        )}
      </div>
    </div>
  );
}
