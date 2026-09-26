import PortalShell from "@/layouts/PortalShell";
import { teacherNav, TEACHER_ALIASES, LEADERSHIP_ALIASES } from "@/layouts/nav/teacher";
import { useMyPosition } from "@/features/positions/queries/usePositions";
import { POSITION_RANK } from "@/shared/lib/constants/people";

export default function TeacherLayout() {
  const { data: position } = useMyPosition();
  const isLeadership = !!position && position.rank <= POSITION_RANK.vicePrincipal;
  const navGroups = teacherNav({
    isLeadership,
    isSectionHead: position?.rank === POSITION_RANK.sectionHead,
  });
  return <PortalShell navGroups={navGroups} navAliases={isLeadership ? LEADERSHIP_ALIASES : TEACHER_ALIASES} />;
}
