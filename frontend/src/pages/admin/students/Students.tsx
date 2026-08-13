import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Search, Add, Edit, TrashCan } from "@carbon/icons-react";
import { Button, IconButton, Select, SelectItem, Pagination, Tag } from "@carbon/react";
import { useStudents, useDeleteStudent } from "../../../queries/useStudents";
import { useGrades } from "../../../queries/useGrades";
import { useHouses } from "../../../queries/useHouses";
import { useCurrentClasses } from "../../../queries/useClasses";
import type { Student } from "../../../services/student";
import { usePagination } from "../../../hooks/usePagination";
import { getErrorMessage } from "../../../lib/errorMessage";
import TableSkeleton from "../../../components/common/TableSkeleton";
import ErrorMessage from "../../../components/common/ErrorMessage";
import EmptyState from "../../../components/common/EmptyState";
import ConfirmDeleteModal from "../../../components/common/ConfirmDeleteModal";
import AgentFindingsBanner from "../../../components/common/AgentFindingsBanner";

const STUDENT_TABLE_HEADERS = [
  "Index No.",
  "Full Name",
  "Class",
  "House",
  "Phone",
  "WhatsApp",
  "Status",
  "Actions",
];

export default function Students() {
  const navigate = useNavigate();
  const { data: students, isLoading, isError, refetch } = useStudents();
  const { data: grades } = useGrades();
  const { data: houses } = useHouses();
  const { data: classes } = useCurrentClasses();
  const deleteStudent = useDeleteStudent();
  const [query, setQuery] = useState("");
  const [grade, setGrade] = useState("");
  const [cls, setCls] = useState("");
  const [gender, setGender] = useState("");
  const [house, setHouse] = useState("");
  const [toDelete, setToDelete] = useState<Student | null>(null);

  const classOptions = (classes ?? []).filter(
    (c) => !grade || c.grade_name === grade,
  );

  const changeGrade = (value: string) => {
    setGrade(value);
    setCls("");
  };

  const filtered = (students ?? []).filter((s) => {
    const q = query.toLowerCase();
    const matchesSearch =
      s.full_name.toLowerCase().includes(q) ||
      s.index_number.toLowerCase().includes(q);
    const matchesGrade = !grade || s.grade_name === grade;
    const matchesClass = !cls || s.class_name === cls;
    const matchesGender = !gender || s.gender === gender;
    const matchesHouse = !house || s.house_name === house;
    return (
      matchesSearch &&
      matchesGrade &&
      matchesClass &&
      matchesGender &&
      matchesHouse
    );
  });

  const { page, pageSize, pageItems, totalItems, onChange } = usePagination(filtered, 10);

  const handleDelete = () => {
    if (!toDelete) return;
    deleteStudent.mutate(toDelete.id, { onSettled: () => setToDelete(null) });
  };

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Students</h1>
          <p className="os-page__subtitle">Manage student enrolment and profiles</p>
        </div>
        <Button renderIcon={Add} kind="primary" size="md" as={Link} to="/students/new">
          Enrol Student
        </Button>
      </div>

      <AgentFindingsBanner
        jobNames={[
          "zero_guardian_watcher",
          "student_gender_school_type_watcher",
          "unclassed_student_watcher",
          "student_onboarding_watcher",
        ]}
      />

      <div className="os-section">
        <div className="os-toolbar">
          <div className="os-search">
            <Search size={16} className="os-search__icon" />
            <input
              className="os-search__input"
              placeholder="Search by name or index number…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div style={{ minWidth: "9rem" }}>
            <Select
              id="filter-grade"
              labelText=""
              size="md"
              value={grade}
              onChange={(e) => changeGrade(e.target.value)}
            >
              <SelectItem value="" text="All grades" />
              {grades?.map((g) => (
                <SelectItem key={g.id} value={g.name} text={g.name} />
              ))}
            </Select>
          </div>
          <div style={{ minWidth: "9rem" }}>
            <Select
              id="filter-class"
              labelText=""
              size="md"
              value={cls}
              onChange={(e) => setCls(e.target.value)}
            >
              <SelectItem value="" text="All classes" />
              {classOptions.map((c) => (
                <SelectItem key={c.id} value={c.name} text={c.name} />
              ))}
            </Select>
          </div>
          <div style={{ minWidth: "8rem" }}>
            <Select
              id="filter-gender"
              labelText=""
              size="md"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <SelectItem value="" text="Any gender" />
              <SelectItem value="male" text="Male" />
              <SelectItem value="female" text="Female" />
            </Select>
          </div>
          <div style={{ minWidth: "9rem" }}>
            <Select
              id="filter-house"
              labelText=""
              size="md"
              value={house}
              onChange={(e) => setHouse(e.target.value)}
            >
              <SelectItem value="" text="All houses" />
              {houses?.map((h) => (
                <SelectItem key={h.id} value={h.name} text={h.name} />
              ))}
            </Select>
          </div>
        </div>

        {deleteStudent.isError && (
          <div style={{ padding: "0 1.5rem 1rem" }}>
            <ErrorMessage
              message={getErrorMessage(deleteStudent.error, "Failed to delete student.")}
            />
          </div>
        )}

        {isLoading ? (
          <TableSkeleton headers={STUDENT_TABLE_HEADERS} />
        ) : isError ? (
          <ErrorMessage message="Failed to load students" onRetry={refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No students found"
            description="Enrol your first student to get started."
          />
        ) : (
          <>
            <div className="os-section__header">
              <h2 className="os-section__title">All Students</h2>
              <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>
                {filtered.length} records
              </span>
            </div>

            <table className="os-table">
              <thead>
                <tr>
                  <th>Index No.</th>
                  <th>Full Name</th>
                  <th>Class</th>
                  <th>House</th>
                  <th>Phone</th>
                  <th>WhatsApp</th>
                  <th>Status</th>
                  <th style={{ width: "6rem", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <span className="os-table__mono">{s.index_number}</span>
                    </td>
                    <td>
                      <Link to={`/students/${s.id}`} className="os-table__link">
                        {s.full_name}
                      </Link>
                    </td>
                    <td className="os-table__muted">{s.class_name ?? "-"}</td>
                    <td className="os-table__muted">{s.house_name ?? "-"}</td>
                    <td className="os-table__muted">{s.phone ?? "-"}</td>
                    <td className="os-table__muted">{s.whatsapp ?? "-"}</td>
                    <td>
                      {s.enrollment_status === "active" ? (
                        <Tag type="green" size="sm">Active</Tag>
                      ) : (
                        <Tag type="red" size="sm">Left</Tag>
                      )}
                    </td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          gap: "0.25rem",
                          justifyContent: "flex-end",
                        }}
                      >
                        <IconButton
                          label="Edit"
                          kind="ghost"
                          size="sm"
                          onClick={() =>
                            navigate(`/students/${s.id}`, {
                              state: { edit: true },
                            })
                          }
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          label="Delete"
                          kind="ghost"
                          size="sm"
                          onClick={() => setToDelete(s)}
                        >
                          <TrashCan />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              totalItems={totalItems}
              page={page}
              pageSize={pageSize}
              pageSizes={[10, 20, 50]}
              onChange={onChange}
            />
          </>
        )}
      </div>

      <ConfirmDeleteModal
        open={!!toDelete}
        title="Delete student"
        description={
          <>
            Delete <strong>{toDelete?.full_name}</strong>? This removes their
            account and cannot be undone.
          </>
        }
        isPending={deleteStudent.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
