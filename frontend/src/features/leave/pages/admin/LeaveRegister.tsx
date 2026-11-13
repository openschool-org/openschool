import { useState } from "react";
import { Tabs } from "antd";
import SelectField from "@/shared/ui/SelectField";
import FilterBar from "@/shared/ui/FilterBar";
import ActiveFilterTags from "@/shared/ui/ActiveFilterTags";
import DateField from "@/shared/ui/DateField";
import { useListFilters } from "@/shared/hooks/useListFilters";
import { todayISODate } from "@/shared/lib/date";
import { LEAVE_STATUS_TAGS, LEAVE_TYPES } from "@/features/leave/constants";
import LeaveRequestsTable from "@/features/leave/components/LeaveRequestsTable";
import LeaveBalancesTable from "@/features/leave/components/LeaveBalancesTable";
import DailyReliefTable from "@/features/leave/components/DailyReliefTable";

const FILTER_LABELS: Record<string, string> = { query: "Search", status: "Status", type: "Leave type" };
const VIEWS = ["Applications", "Balances", "Relief sheet"];

// The school's leave register: approve applications, check balances and print the day's relief.
// Used by administrators and, in the teacher portal, by the Principal and Vice Principals.
export default function LeaveRegister() {
  const thisYear = new Date().getFullYear();
  const [view, setView] = useState(0);
  const [year, setYear] = useState(thisYear);
  const [date, setDate] = useState(todayISODate());
  const { filters, set, clear, activeKeys, debouncedSearch } = useListFilters({ query: "", status: "", type: "" });

  const yearPicker = {
    label: "Year",
    node: (
      <SelectField id="leave-register-year" label="Year" hideLabel className="os-min-w-7" value={String(year)} onChange={(v) => setYear(Number(v))} options={[thisYear + 1, thisYear, thisYear - 1, thisYear - 2].map((y) => ({ value: String(y), label: String(y) }))} />
    ),
  };

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Teacher leave</h1>
          <p className="os-page__subtitle">Approve leave applications, check balances and see who covers each period</p>
        </div>
      </div>

      <Tabs
        className="os-detail-tabs"
        activeKey={String(view)}
        onChange={(k) => setView(Number(k))}
        aria-label="Leave register view"
        items={VIEWS.map((v, i) => ({ key: String(i), label: v }))}
      />

      <div className="os-section os-mt-4">
        {view === 2 ? (
          <>
            <div className="os-section__body">
              <DateField id="leave-relief-date" labelText="Date" value={date} onChange={(v) => v && setDate(v)} />
            </div>
            <DailyReliefTable date={date} />
          </>
        ) : (
          <>
            <FilterBar
              search={{ value: filters.query, onChange: (v) => set("query", v), placeholder: "Search by teacher name or employee number…" }}
              controls={view === 1 ? [yearPicker] : [
                yearPicker,
                {
                  label: "Status",
                  node: (
                    <SelectField id="leave-filter-status" label="Status" hideLabel value={filters.status} onChange={(v) => set("status", v)} options={[{ value: "", label: "Any status" }, ...Object.entries(LEAVE_STATUS_TAGS).map(([value, tag]) => ({ value, label: tag.label }))]} />
                  ),
                },
                {
                  label: "Leave type",
                  node: (
                    <SelectField id="leave-filter-type" label="Leave type" hideLabel value={filters.type} onChange={(v) => set("type", v)} options={[{ value: "", label: "All leave types" }, ...LEAVE_TYPES.map((t) => ({ value: t.value, label: t.label }))]} />
                  ),
                },
              ]}
            />
            <ActiveFilterTags
              filters={activeKeys.map((k) => ({ key: k, label: FILTER_LABELS[k], value: filters[k] }))}
              onClear={(k) => clear(k as keyof typeof filters)}
              onClearAll={() => clear()}
            />
            {view === 0 ? (
              <LeaveRequestsTable key={`${year}-${debouncedSearch}-${filters.status}-${filters.type}`} year={year} search={debouncedSearch} status={filters.status} leaveType={filters.type} />
            ) : (
              <LeaveBalancesTable key={`${year}-${debouncedSearch}`} year={year} search={debouncedSearch} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
