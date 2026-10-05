package app

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	attendancemodule "github.com/openschool-org/openschool/internal/modules/attendance"
	leadershipmodule "github.com/openschool-org/openschool/internal/modules/leadership"
	leavemodule "github.com/openschool-org/openschool/internal/modules/leave"
	selfservicemodule "github.com/openschool-org/openschool/internal/modules/selfservice"
)

// leaveApprovers maps Leadership positions onto who may decide leave.
type leaveApprovers struct {
	positions *leadershipmodule.Service
	profiles  *selfservicemodule.TeacherProfiles
}

func (a leaveApprovers) LeaveRank(ctx context.Context, teacherID uuid.UUID) (leavemodule.ApproverRank, error) {
	// Principal and Vice Principal are not year-scoped, so a school between
	// academic years still has its approvers.
	yearID, err := a.profiles.CurrentAcademicYearID(ctx)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return leavemodule.NotApprover, err
	}
	rank, _, err := a.positions.RankForTeacher(ctx, teacherID, yearID)
	switch {
	case err != nil:
		return leavemodule.NotApprover, err
	case rank == leadershipmodule.RankPrincipal:
		return leavemodule.Principal, nil
	case rank == leadershipmodule.RankVicePrincipal:
		return leavemodule.VicePrincipal, nil
	}
	return leavemodule.NotApprover, nil
}

// leaveAttendance writes approved leave days onto the staff attendance register.
type leaveAttendance struct {
	staff *attendancemodule.StaffService
}

func (a leaveAttendance) MarkTeacherOnLeave(ctx context.Context, teacherID uuid.UUID, date time.Time, note string, markedBy uuid.UUID) error {
	_, err := a.staff.Mark(ctx, attendancemodule.MarkStaffAttendanceRequest{
		TeacherID: teacherID.String(), Date: date, Status: "leave", Note: note,
	}, markedBy)
	return err
}

func registerLeave(groups HTTPGroups, pool *pgxpool.Pool, profiles portalProfiles, shared sharedServices) {
	service := leavemodule.NewService(
		leavemodule.NewRepository(pool),
		leaveApprovers{positions: shared.leadership, profiles: profiles.teacher},
		leaveAttendance{staff: attendancemodule.NewStaffService(attendancemodule.NewRepository(pool))},
		shared.notifications, profiles.teacher, shared.audit,
	)
	leavemodule.RegisterRoutes(groups.Teacher, groups.TeacherOrAdmin, service, profiles.teacher)
}
