package selfservice

import (
	"context"

	"github.com/google/uuid"
	dashboardmodule "github.com/openschool-org/openschool/internal/modules/dashboard"
	leadershipmodule "github.com/openschool-org/openschool/internal/modules/leadership"
	studentleadershipmodule "github.com/openschool-org/openschool/internal/modules/studentleadership"
	timetablemodule "github.com/openschool-org/openschool/internal/modules/timetable"
)

// TimetableReader is the narrow timetable capability needed by parent and
// teacher self-service; mutation remains owned by the Timetable module.
type TimetableReader interface {
	GetPublishedForStudent(context.Context, uuid.UUID) (timetablemodule.PublishedSchedule, error)
	ListByAcademicYear(context.Context, uuid.UUID) ([]timetablemodule.TimetableListItem, error)
}

// LeadershipReader exposes only the rank and overview operations used by the
// teacher portal.
type LeadershipReader interface {
	SummaryForTeacher(context.Context, uuid.UUID, uuid.UUID) (leadershipmodule.PositionSummary, error)
	RankForTeacher(context.Context, uuid.UUID, uuid.UUID) (leadershipmodule.PositionRank, leadershipmodule.Position, error)
	LeadershipOverview(context.Context, uuid.UUID, uuid.UUID) (leadershipmodule.LeadershipOverviewSummary, error)
	LedClasses(context.Context, uuid.UUID, uuid.UUID) ([]leadershipmodule.LedClass, error)
}

// SocietyReader exposes a teacher's current Teacher-in-Charge assignment.
type SocietyReader interface {
	GetSocietyForTeacher(context.Context, uuid.UUID, uuid.UUID) (studentleadershipmodule.Society, error)
}

// DashboardReader exposes the leadership analytics read model.
type DashboardReader interface {
	Analytics(context.Context) (dashboardmodule.DashboardAnalyticsResponse, error)
}
