import type { ReactNode } from "react";
import { Button, Descriptions } from "antd";
import type { SchoolSetupState } from "@/features/school/hooks/useSchoolSetupState";
import { AL_STREAM_DEFS, alClassName, facilityTypeLabel, regularClassName, type StepName } from "@/features/school/setupConstants";

interface Props {
  state: SchoolSetupState;
  onEdit: (step: StepName) => void;
}

const SCHOOL_TYPE = { mixed: "Mixed", boys: "Boys", girls: "Girls" } as const;

// The class names the setup will create, grade by grade (mirrors lib/setupClasses).
function plannedClasses(s: SchoolSetupState): { grade: number; names: string[] }[] {
  const regular = s.regularGradeNumbers.map((grade) => ({
    grade,
    names: Array.from({ length: s.sectionsPerGrade[grade] ?? 1 }, (_, i) => regularClassName(grade, i)),
  }));
  const al = s.alGradeNumbers.map((grade) => ({
    grade,
    names: AL_STREAM_DEFS.flatMap((def) => {
      const cfg = s.alStreams[grade][def.key];
      if (!cfg.enabled) return [];
      return Array.from({ length: cfg.sections }, (_, i) => alClassName(grade, cfg.code.trim() || def.defaultCode, i));
    }),
  }));
  return [...regular, ...al].filter((row) => row.names.length > 0);
}

function Section({ title, step, onEdit, children }: { title: string; step: StepName; onEdit: Props["onEdit"]; children: ReactNode }) {
  return (
    <section className="os-setup-review">
      <div className="os-setup-review__head">
        <h3 className="os-setup-section__title">{title}</h3>
        <Button type="link" size="small" onClick={() => onEdit(step)}>Edit</Button>
      </div>
      {children}
    </section>
  );
}

const none = <span className="os-setup-muted">None</span>;
const skipped = <span className="os-setup-muted">Skipped</span>;

export default function ReviewStep({ state: s, onEdit }: Props) {
  const houses = s.housesSkipped ? [] : s.houses.filter((h) => h.name.trim());
  const rooms = s.roomsSkipped ? [] : s.facilityRooms.filter((r) => r.name.trim());
  const classes = s.classesSkipped ? [] : plannedClasses(s);
  const classCount = classes.reduce((sum, row) => sum + row.names.length, 0);

  return (
    <div className="os-setup-review-list">
      <Section title="School details" step="School" onEdit={onEdit}>
        <Descriptions size="small" column={{ xs: 1, md: 2 }} items={[
          { key: "name", label: "Name", children: s.school.name },
          { key: "type", label: "Type", children: SCHOOL_TYPE[s.school.school_type] },
          { key: "phone", label: "Phone", children: s.school.phone },
          { key: "email", label: "Email", children: s.school.email },
          { key: "address", label: "Address", children: s.school.address },
          { key: "logo", label: "Logo", children: s.school.logo_url ? "Added" : none },
        ]} />
      </Section>

      <Section title="Houses" step="Houses" onEdit={onEdit}>
        {s.housesSkipped ? skipped : houses.length === 0 ? none : (
          <div className="os-setup-classes">
            {houses.map((h) => (
              <span key={h.name} className="os-setup-class">
                <span className="os-setup-swatch" style={{ background: h.color }} aria-hidden="true" />
                <span className="os-setup-class__name">{h.name.trim()}</span>
                {h.code.trim() && <span className="os-setup-muted">{h.code.trim()}</span>}
              </span>
            ))}
          </div>
        )}
      </Section>

      <Section title="Grades and mediums" step="Grades" onEdit={onEdit}>
        <Descriptions size="small" column={1} items={[
          { key: "grades", label: "Grades", children: s.orderedSelectedGrades.map((g) => `Grade ${g}`).join(", ") },
          { key: "mediums", label: "Mediums", children: s.mediumsSkipped ? skipped : s.selectedMediumNames.join(", ") || none },
        ]} />
      </Section>

      <Section title="Classes" step="Classes" onEdit={onEdit}>
        {s.classesSkipped ? skipped : (
          <>
            <p className="os-setup-review__summary">
              {classCount} class{classCount === 1 ? "" : "es"} for {s.yearLabel.trim()}, up to {s.classCapacity} students each.
            </p>
            <Descriptions
              size="small"
              column={{ xs: 1, md: 2 }}
              items={classes.map((row) => ({ key: row.grade, label: `Grade ${row.grade}`, children: row.names.join(", ") }))}
            />
          </>
        )}
      </Section>

      <Section title="Rooms and facilities" step="Rooms" onEdit={onEdit}>
        {s.roomsSkipped ? skipped : rooms.length === 0 ? none : (
          <table className="os-table os-table--no-hover os-setup-table">
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id}>
                  <td className="os-setup-table__strong">{room.name.trim()}</td>
                  <td>{facilityTypeLabel(room.group)}</td>
                  <td className="os-setup-table__narrow">{room.capacity === "" ? "" : `${room.capacity} seats`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}
