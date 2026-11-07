import { useState } from "react";
import { Select, SelectItem, Tab, TabList, Tabs } from "@carbon/react";
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
      <Select id="leave-register-year" labelText="Year" hideLabel size="md" value={String(year)} onChange={(e) => setYear(Number(e.target.value))}>
        {[thisYear + 1, thisYear, thisYear - 1, thisYear - 2].map((y) => <SelectItem key={y} value={String(y)} text={String(y)} />)}
      </Select>
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

      <Tabs selectedIndex={view} onChange={({ selectedIndex }) => setView(selectedIndex)}>
        <TabList aria-label="Leave register view">
          {VIEWS.map((v) => <Tab key={v}>{v}</Tab>)}
        </TabList>
      </Tabs>

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
                    <Select id="leave-filter-status" labelText="Status" hideLabel size="md" value={filters.status} onChange={(e) => set("status", e.target.value)}>
                      <SelectItem value="" text="Any status" />
                      {Object.entries(LEAVE_STATUS_TAGS).map(([value, tag]) => <SelectItem key={value} value={value} text={tag.label} />)}
                    </Select>
                  ),
                },
                {
                  label: "Leave type",
                  node: (
                    <Select id="leave-filter-type" labelText="Leave type" hideLabel size="md" value={filters.type} onChange={(e) => set("type", e.target.value)}>
                      <SelectItem value="" text="All leave types" />
                      {LEAVE_TYPES.map((t) => <SelectItem key={t.value} value={t.value} text={t.label} />)}
                    </Select>
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
