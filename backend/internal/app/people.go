package app

import (
	"github.com/jackc/pgx/v5/pgxpool"
	auditmodule "github.com/openschool-org/openschool/internal/modules/audit"
	automationmodule "github.com/openschool-org/openschool/internal/modules/automation"
	peoplemodule "github.com/openschool-org/openschool/internal/modules/people"
	schoolmodule "github.com/openschool-org/openschool/internal/modules/school"
	"github.com/openschool-org/openschool/internal/ports"
	"github.com/openschool-org/openschool/internal/thunderid"
)

func registerPeople(groups HTTPGroups, pool *pgxpool.Pool, houses ports.HouseAssignments, audit *auditmodule.Service, access ports.ClassAccess) {
	studentStore := peoplemodule.NewStudentStore(pool)
	// automationmodule.Repository backs PendingEraser too — IdentityErasureRetryAgent
	// (internal/modules/automation) is what actually retries a failed local
	// scrub/identity-provider deletion recorded here (S11).
	pendingEraser := automationmodule.NewRepository(pool)
	studentService := peoplemodule.NewStudentService(studentStore, thunderid.NewClient(), houses, audit, schoolmodule.NewSchoolTypeReader(pool), pendingEraser)
	peoplemodule.RegisterStudentRoutes(groups.Admin, groups.TeacherOrAdmin, studentService, studentStore, studentService, audit, access)

	teacherService := peoplemodule.NewTeacherService(studentStore, thunderid.NewClient(), houses, audit)
	peoplemodule.RegisterTeacherReadRoutes(groups.TeacherOrAdmin, groups.Admin, peoplemodule.NewTeacherReader(pool))
	peoplemodule.RegisterTeacherWriteRoutes(groups.Admin, teacherService)

	guardianStore := peoplemodule.NewGuardianStore(pool)
	guardianService := peoplemodule.NewGuardianService(guardianStore, thunderid.NewClient(), audit)
	peoplemodule.RegisterGuardianReadRoutes(groups.TeacherOrAdmin, groups.StudentAccess, peoplemodule.NewGuardianReader(pool))
	peoplemodule.RegisterGuardianWriteRoutes(groups.Admin, guardianService)
	peoplemodule.RegisterGuardianNotificationRoute(groups.Admin, peoplemodule.NewGuardianNotificationReader(pool))

	staffService := peoplemodule.NewNonAcademicStaffService(peoplemodule.NewNonAcademicStaffStore(pool), audit)
	peoplemodule.RegisterNonAcademicStaffRoutes(groups.Admin, groups.TeacherOrAdmin, staffService)
	portfolioService := peoplemodule.NewStudentPortfolioService(peoplemodule.NewStudentPortfolioStore(pool))
	peoplemodule.RegisterStudentPortfolioRoutes(groups.TeacherOrAdmin, groups.StudentAccess, portfolioService, access)
}
