import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button, Tag, Tooltip } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined, UploadOutlined } from "@ant-design/icons";
import LinkButton from "@/shared/ui/LinkButton";
import SelectField from "@/shared/ui/SelectField";
import EntityCombobox from "@/shared/ui/EntityCombobox";
import DataGrid, { type GridColumn } from "@/shared/ui/DataGrid";
import FilterBar from "@/shared/ui/FilterBar";
import ActiveFilterTags from "@/shared/ui/ActiveFilterTags";
import ListState from "@/shared/ui/ListState";
import TableSkeleton from "@/shared/ui/TableSkeleton";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import AgentFindingsBanner from "@/features/notifications/components/AgentFindingsBanner";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import { useListFilters } from "@/shared/hooks/useListFilters";
import { usePersistedPageSize } from "@/shared/hooks/usePersistedPageSize";
import { useStudents, useDeleteStudent } from "@/features/students/queries/useStudents";
import { useGrades } from "@/features/academics/queries/useGrades";
import { useHouses } from "@/features/school/queries/useHouses";
import { useCurrentClasses } from "@/features/academics/queries/useClasses";
import type { Student } from "@/features/students/api/student";
import Avatar from "@/shared/ui/Avatar";
import { displayName } from "@/shared/lib/name";

const FILTER_LABELS: Record<string, string> = {
  query: "Search",
  grade: "Grade",
  cls: "Class",
  gender: "Gender",
  house: "House",
};


export default function Students() {
  const navigate = useNavigate();
  const { data: grades } = useGrades();
  const { data: houses } = useHouses();
  const { data: classes } = useCurrentClasses();
  const deleteStudent = useDeleteStudent();
  const [toDelete, setToDelete] = useState<Student | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePersistedPageSize("students");

  const { filters, set, clear, activeKeys, debouncedSearch } = useListFilters({
    query: "",
    grade: "",
    cls: "",
    gender: "",
    house: "",
  });

  const classOptions = useMemo(
    () => (classes ?? []).filter((c) => !filters.grade || c.grade_name === filters.grade),
    [classes, filters.grade],
  );

  // The server does the filtering now; search/filters/page/size all live in
  // the query key so a different combination is a different cache entry,
  // and keepPreviousData (in useStudents) keeps the old page on screen
  // while the next one loads instead of flashing a skeleton.
  const params = {
    limit: pageSize,
    offset: (page - 1) * pageSize,
    search: debouncedSearch,
    grade: filters.grade,
    class: filters.cls,
    gender: filters.gender,
    house: filters.house,
  };
  const { data, isLoading, isError, refetch } = useStudents(params);
  const students = data?.items ?? [];

  // A filter/search change makes the current page number meaningless against the new result set.
  const setFilter = <K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) => {
    setPage(1);
    set(key, value);
  };

  const columns: GridColumn<Student>[] = [
    { key: "index_number", header: "Index no.", render: (s) => <span className="os-table__mono">{s.index_number}</span> },
    {
      key: "full_name",
      header: "Full name",
      render: (s) => (
        <div className="os-flex os-items-center os-gap-2">
          <Avatar name={s.full_name} size="sm" />
          <Link to={`/students/${s.id}`} className="os-table__link" title={s.full_name}>{displayName(s)}</Link>
        </div>
      ),
    },
    { key: "class_name", header: "Class", render: (s) => <span className="os-table__muted">{s.class_name ?? "-"}</span> },
    { key: "house_name", header: "House", render: (s) => <span className="os-table__muted">{s.house_name ?? "-"}</span> },
    { key: "phone", header: "Phone", render: (s) => <span className="os-table__muted">{s.phone ?? "-"}</span> },
    { key: "whatsapp", header: "WhatsApp", render: (s) => <span className="os-table__muted">{s.whatsapp ?? "-"}</span> },
    {
      key: "enrollment_status",
      header: "Status",
      render: (s) =>
        s.enrollment_status === "active" ? <Tag color="success" variant="filled">Active</Tag> : <Tag color="error" variant="filled">Left</Tag>,
    },
    {
      key: "actions",
      header: "Actions",
      align: "end",
      render: (s) => (
        <div className="os-grid__actions">
          <Tooltip title="Edit profile">
            <Button type="text" size="small" aria-label="Edit profile" icon={<EditOutlined />} onClick={() => navigate(`/students/${s.id}`, { state: { edit: true } })} />
          </Tooltip>
          <Tooltip title="Delete student">
            <Button type="text" size="small" danger aria-label="Delete student" icon={<DeleteOutlined />} onClick={() => setToDelete(s)} />
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Students</h1>
          <p className="os-page__subtitle">Manage student enrolment and profiles</p>
        </div>
        <div className="os-flex os-gap-2">
          <LinkButton to="/students/import" icon={<UploadOutlined />}>
            Import students
          </LinkButton>
          <LinkButton to="/students/new" type="primary" icon={<PlusOutlined />}>
            Enrol student
          </LinkButton>
        </div>
      </div>

      <AgentFindingsBanner />

      <div className="os-section">
        <FilterBar
          search={{ value: filters.query, onChange: (v) => setFilter("query", v), placeholder: "Search by name or index number…" }}
          controls={[
            {
              label: "Grade",
              node: (
                <EntityCombobox
                  id="filter-grade"
                  items={grades ?? []}
                  selectedId={filters.grade}
                  onSelect={(v) => { setFilter("grade", v); setFilter("cls", ""); }}
                  getId={(g) => g.name}
                  itemToString={(g) => g.name}
                  ariaLabel="Grade"
                  placeholder="All grades"
                />
              ),
            },
            {
              label: "Class",
              node: (
                <EntityCombobox
                  id="filter-class"
                  items={classOptions}
                  selectedId={filters.cls}
                  onSelect={(v) => setFilter("cls", v)}
                  getId={(c) => c.name}
                  itemToString={(c) => c.name}
                  ariaLabel="Class"
                  placeholder="All classes"
                />
              ),
            },
            {
              label: "Gender",
              node: (
                <SelectField
                  id="filter-gender"
                  label="Gender"
                  hideLabel
                  value={filters.gender}
                  onChange={(v) => setFilter("gender", v)}
                  options={[{ value: "", label: "Any gender" }, { value: "male", label: "Male" }, { value: "female", label: "Female" }]}
                />
              ),
            },
            {
              label: "House",
              node: (
                <SelectField
                  id="filter-house"
                  label="House"
                  hideLabel
                  value={filters.house}
                  onChange={(v) => setFilter("house", v)}
                  options={[{ value: "", label: "All houses" }, ...(houses ?? []).map((h) => ({ value: h.name, label: h.name }))]}
                />
              ),
            },
          ]}
        />

        <ActiveFilterTags
          filters={activeKeys.map((k) => ({ key: k, label: FILTER_LABELS[k], value: filters[k] }))}
          onClear={(k) => { clear(k as keyof typeof filters); setPage(1); }}
          onClearAll={() => { clear(); setPage(1); }}
        />

        <MutationErrorNotification
          isError={deleteStudent.isError}
          error={deleteStudent.error}
          title="Could not delete student"
          fallback="Please try again."
          onClose={() => deleteStudent.reset()}
          className="os-section__notice"
        />

        <ListState
          isLoading={isLoading}
          isError={isError}
          isEmpty={students.length === 0}
          errorMessage="Failed to load students"
          onRetry={refetch}
          skeleton={<TableSkeleton headers={columns.map((c) => c.header)} />}
          empty={{ title: "No students found", description: "Enrol your first student or adjust your search filters to get started." }}
        >
          <DataGrid
            rows={students}
            columns={columns}
            getRowId={(s) => s.id}
            countLabel={(shown, total) => `Showing ${shown} of ${total} students`}
            server={{ page, pageSize, totalItems: data?.total ?? 0, onChange: ({ page: p, pageSize: ps }) => { setPage(p); setPageSize(ps); } }}
          />
        </ListState>
      </div>

      <ConfirmDeleteModal
        open={!!toDelete}
        title="Delete student"
        description={<>Delete <strong>{toDelete ? displayName(toDelete) : ""}</strong>? This removes their account and cannot be undone.</>}
        subject="Student"
        mutation={deleteStudent}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteStudent.mutate(toDelete.id)}
      />
    </div>
  );
}
