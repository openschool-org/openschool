import type { MyStudentProfile } from "@/features/students/api/studentSelf";
import { useYearTermItems } from "@/features/school/hooks/useYearTermItems";
import ContextStrip from "@/shared/ui/ContextStrip";
import { useT } from "@/shared/i18n/useT";

// Where the student is in the school year: year, term, class and house.
export default function StudentContextStrip({ profile }: { profile: MyStudentProfile }) {
  const { t } = useT();
  const yearTerm = useYearTermItems(profile.grade_name);
  return (
    <ContextStrip
      label={t("student.currentTerm")}
      items={[
        ...yearTerm,
        {
          key: "class",
          label: t("student.myClass"),
          value: profile.class_name ?? "-",
          meta: profile.form_teacher_name ? t("student.formTeacher", { name: profile.form_teacher_name }) : undefined,
        },
        { key: "house", label: t("student.house"), value: profile.house_name ?? "-", meta: profile.index_number },
      ]}
    />
  );
}
