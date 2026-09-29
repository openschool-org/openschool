import { Education, Home, Music } from "@carbon/icons-react";
import { useClassrooms } from "@/features/timetable/queries/useClassrooms";
import Classrooms from "@/features/timetable/pages/admin/Classrooms";

const RESOURCE_TYPES = [
  { key: "regular", label: "Homerooms & classrooms", icon: Home },
  { key: "lab", label: "Labs", icon: Education },
  { key: "eca", label: "Libraries, halls & facilities", icon: Music },
] as const;

export default function Resources() {
  const { data: classrooms } = useClassrooms();

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">School resources</h1>
          <p className="os-page__subtitle">View and manage homerooms, libraries, auditoriums, labs, and other facilities in one place.</p>
        </div>
      </div>

      <div className="os-grid os-grid-cols-3 os-gap-4 os-mb-6">
        {RESOURCE_TYPES.map(({ key, label, icon: Icon }) => (
          <div key={key} className="os-bg-layer os-border os-p-5">
            <div className="os-flex os-items-center os-gap-2 os-mb-3">
              <Icon size={20} className="os-fill-accent" />
              <span className="os-text-sm os-fw-600 os-c-secondary">{label}</span>
            </div>
            <strong className="os-text-4xl os-fw-300 os-c-primary">{classrooms?.filter((room) => room.room_type === key).length ?? 0}</strong>
          </div>
        ))}
      </div>

      <Classrooms inline />
    </div>
  );
}
