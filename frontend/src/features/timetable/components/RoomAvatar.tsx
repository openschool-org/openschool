import type { Classroom } from "@/features/timetable/api/classroom";
import GradeAvatar from "@/shared/ui/GradeAvatar";
import { homeroomGrade, roomKind } from "@/features/timetable/lib/roomKind";

// Homerooms show their class ("10" over "A" for 10-A); facilities show an icon for their kind.
export default function RoomAvatar({ room }: { room: Classroom }) {
  if (room.room_type === "regular") return <GradeAvatar gradeName={homeroomGrade(room)} className={room.name} />;
  const { Icon, band } = roomKind(room);
  return (
    <span className={`os-grade-avatar os-grade-avatar--md os-grade-band--${band}`} aria-hidden="true">
      <Icon size={20} />
    </span>
  );
}
