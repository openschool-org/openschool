import { useState } from "react";
import { Tab, TabList, Tabs, Tag, Toggle } from "@carbon/react";
import type { StaffKind } from "@/features/attendance/api/staffAttendance";
import StaffRosterTable from "@/features/attendance/components/staff/StaffRosterTable";
import StaffMonthlyTable from "@/features/attendance/components/staff/StaffMonthlyTable";
import { todayISODate, formatLongDate } from "@/shared/lib/date";
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
  const [kindIndex, setKindIndex] = useState(0);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 250);
  const kind = KINDS[kindIndex].value;

  const [year, month] = date.split("-").map(Number);

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Staff attendance</h1>
          <p className="os-page__subtitle">Mark daily staff attendance or view monthly summaries.</p>
        </div>
      </div>

      <div className="os-flex os-items-center os-gap-6 os-mb-6 os-wrap">
        <DateField value={date} onChange={(ymd) => ymd && setDate(ymd)} id="staff-attendance-date" labelText={showMonthly ? "Month (any day)" : "Date"} />
        <Toggle
          id="staff-attendance-view-toggle"
          labelText="View"
          labelA="Daily"
          labelB="Monthly summary"
          toggled={showMonthly}
          onToggle={(checked) => setShowMonthly(checked)}
        />
        {!showMonthly && <Tag type="gray">{formatLongDate(date)}</Tag>}
      </div>

      <Tabs selectedIndex={kindIndex} onChange={({ selectedIndex }) => setKindIndex(selectedIndex)}>
        <TabList aria-label="Staff type">
          {KINDS.map((k) => (
            <Tab key={k.value}>{k.label}</Tab>
          ))}
        </TabList>
      </Tabs>

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
