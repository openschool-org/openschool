// Package app owns the OpenSchool API composition root.
package app

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	automationmodule "github.com/openschool-org/openschool/internal/modules/automation"
	notificationmodule "github.com/openschool-org/openschool/internal/modules/notifications"
	peoplemodule "github.com/openschool-org/openschool/internal/modules/people"
)

// Setup composes the API modules and returns the scheduler owned by the process lifecycle.
func Setup(router *gin.Engine, pool *pgxpool.Pool) *automationmodule.Scheduler {
	groups := newHTTPGroups(router, peoplemodule.NewStudentAccessAuthorizer(pool))
	shared := registerCore(groups, pool)
	houseService := registerSchool(groups, pool, shared.audit)
	registerTimetable(groups, pool, shared.notifications)
	registerAcademics(groups, pool)
	registerPeople(groups, pool, houseService, shared.audit)
	profiles := newPortalProfiles(pool)
	registerAttendanceAndReports(groups, pool, shared.notifications, shared.audit, shared.leadership, profiles.teacher)
	registerSelfService(groups, pool, profiles, shared)
	notificationmodule.RegisterRoutes(groups.TeacherOrAdmin, groups.Protected, shared.notifications)
	registerWorkflows(groups, pool, shared)

	return automationmodule.RegisterRoutes(groups.Admin, pool)
}
