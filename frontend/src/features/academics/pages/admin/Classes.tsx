import { useMemo, useState } from "react";
import { Button, Segmented } from "antd";
import FilterBar from "@/shared/ui/FilterBar";
import { PlusOutlined } from "@ant-design/icons";
import type { Grade } from "@/features/academics/api/grade";
import type { ClassWithDetails } from "@/features/academics/api/class";
import { useGradesPage } from "@/features/academics/hooks/useGradesPage";
import GradesBody from "@/features/academics/components/GradesBody";
import { filterGrades } from "@/features/academics/lib/gradeFilter";
import { useEditClass } from "@/features/academics/hooks/useEditClass";
import GradeFormModal from "@/features/academics/components/GradeFormModal";
import ClassFormModal from "@/features/academics/components/ClassFormModal";
import EditClassModal from "@/features/academics/components/EditClassModal";
import { useMediums } from "@/features/curriculum/queries/useCurriculum";
import { useClassrooms } from "@/features/timetable/queries/useClassrooms";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import AgentFindingsBanner from "@/features/notifications/components/AgentFindingsBanner";
import PageHeader from "@/shared/ui/PageHeader";
export default function Classes() {
  const page = useGradesPage();
  const { orderedGrades, classesByGrade, mutations, form } = page;
  const { createGrade, updateGrade, deleteGrade, reorder, deleteClass } = mutations;
  const [gradeToDelete, setGradeToDelete] = useState<Grade | null>(null);
  const [classToDelete, setClassToDelete] = useState<ClassWithDetails | null>(null);
  const [classModalGradeId, setClassModalGradeId] = useState<string | null>(null);
  const edit = useEditClass();
  const { data: mediums } = useMediums();
  const { data: classrooms } = useClassrooms();

  const [query, setQuery] = useState("");
  const [section, setSection] = useState("all");
  const visible = useMemo(
    () => filterGrades(orderedGrades, classesByGrade, query, section, page.teacherName),
    [orderedGrades, classesByGrade, query, section, page],
  );
  const ready = !page.grades.isLoading && !page.classes.isLoading && !page.grades.isError && !page.classes.isError;
  const saving = form.gradeModal === "edit" ? updateGrade : createGrade;

  return (
    <div className="os-page">
      <PageHeader title="Grades &amp; classes" subtitle="Grades and their classes for the current academic year.">
        <div className="os-flex os-gap-3">
          <Button icon={<PlusOutlined />} onClick={page.openCreateGrade}>Add grade</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setClassModalGradeId("")}>Add class</Button>
        </div>
      </PageHeader>

      <AgentFindingsBanner />

      {ready && orderedGrades.length > 0 && (
        <div className="os-grades-filter">
          <FilterBar
            search={{ value: query, onChange: setQuery, placeholder: "Search classes or form teachers…" }}
            controls={[
              {
                label: "School section",
                node: (
                  <Segmented
                    value={section}
                    onChange={(v) => setSection(String(v))}
                    options={[
                      { value: "all", label: "All" },
                      { value: "primary", label: "Primary" },
                      { value: "junior", label: "Junior" },
                      { value: "ol", label: "O/L" },
                      { value: "al", label: "A/L" },
                    ]}
                  />
                ),
              },
            ]}
          />
        </div>
      )}

        {(deleteGrade.isError || deleteClass.isError || reorder.isError) && (
          <div className="os-stack os-mb-4">
            <MutationErrorNotification isError={deleteGrade.isError} error={deleteGrade.error} title="Could not delete grade" fallback="The grade may be used by a class or curriculum level." onClose={() => deleteGrade.reset()} />
            <MutationErrorNotification isError={deleteClass.isError} error={deleteClass.error} title="Could not delete class" fallback="The class may still have students enrolled." onClose={() => deleteClass.reset()} />
            <MutationErrorNotification isError={reorder.isError} error={reorder.error} title="Could not reorder" fallback="Please try again." onClose={() => reorder.reset()} />
          </div>
        )}

        <GradesBody
          page={page}
          visible={visible}
          filtering={!!query.trim() || section !== "all"}
          onDeleteGrade={setGradeToDelete}
          onDeleteClass={setClassToDelete}
          onAddClass={setClassModalGradeId}
          onEditClass={edit.open}
        />

      {form.gradeModal && (
        <GradeFormModal
          mode={form.gradeModal}
          name={form.gradeName}
          onNameChange={form.setGradeName}
          nameTouched={form.gradeNameTouched}
          onNameBlur={() => form.setGradeNameTouched(true)}
          onClose={form.closeModal}
          onSubmit={page.saveGrade}
          isPending={saving.isPending}
          isError={saving.isError}
          error={saving.error}
        />
      )}

      {classModalGradeId !== null && <ClassFormModal key={classModalGradeId} open gradeId={classModalGradeId} onClose={() => setClassModalGradeId(null)} />}

      <EditClassModal
        open={!!edit.editing}
        nameEdit={edit.name}
        onNameEditChange={edit.setName}
        mediumEdit={edit.medium}
        onMediumEditChange={edit.setMedium}
        mediums={mediums}
        homeClassroomEdit={edit.homeClassroom}
        onHomeClassroomEditChange={edit.setHomeClassroom}
        classrooms={classrooms}
        updateClass={edit.updateClass}
        onClose={edit.close}
        onSave={edit.save}
      />

      <ConfirmDeleteModal
        open={!!gradeToDelete}
        title="Delete grade"
        description={<>Delete <strong>{gradeToDelete?.name}</strong>? This is blocked while a class or curriculum level uses it.</>}
        subject="Grade"
        mutation={deleteGrade}
        onClose={() => setGradeToDelete(null)}
        onConfirm={() => gradeToDelete && deleteGrade.mutate(gradeToDelete.id)}
      />

      <ConfirmDeleteModal
        open={!!classToDelete}
        title="Delete class"
        description={<>Delete <strong>{classToDelete?.name}</strong>? This is blocked while students are still enrolled in it.</>}
        subject="Class"
        mutation={deleteClass}
        onClose={() => setClassToDelete(null)}
        onConfirm={() => classToDelete && deleteClass.mutate(classToDelete.id)}
      />
    </div>
  );
}
