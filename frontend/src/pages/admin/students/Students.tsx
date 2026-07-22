import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Search, Add, Edit, TrashCan } from "@carbon/icons-react";
import { Button, IconButton, Select, SelectItem } from "@carbon/react";
import { useStudents, useDeleteStudent } from "../../../queries/useStudents";
import { useGrades } from "../../../queries/useGrades";
import { useHouses } from "../../../queries/useHouses";
import { useCurrentClasses } from "../../../queries/useClasses";
import type { Student } from "../../../services/student";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ErrorMessage from "../../../components/common/ErrorMessage";
import EmptyState from "../../../components/common/EmptyState";
import ConfirmDeleteModal from "../../../components/common/ConfirmDeleteModal";

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

        {isLoading ? (
          <LoadingSpinner />
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
                  <th style={{ width: "6rem", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <span className="os-table__mono">{s.index_number}</span>
                    </td>
                    <td>
                      <Link to={`/students/${s.id}`} className="os-table__link">
                        {s.full_name}
                      </Link>
                    </td>
                    <td className="os-table__muted">{s.class_name ?? "—"}</td>
                    <td className="os-table__muted">{s.house_name ?? "—"}</td>
                    <td className="os-table__muted">{s.phone ?? "—"}</td>
                    <td className="os-table__muted">{s.whatsapp ?? "—"}</td>
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
