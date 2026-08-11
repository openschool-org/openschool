package routes

import (
	"os"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/middleware"
	"github.com/openschool-org/openschool/internal/repositories"
	notificationroutes "github.com/openschool-org/openschool/internal/routes/notifications"
	timetableroutes "github.com/openschool-org/openschool/internal/routes/timetable"
	"github.com/openschool-org/openschool/internal/services"
)

func envFloatOr(key string, fallback float64) float64 {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.ParseFloat(v, 64); err == nil {
			return n
		}
	}
	return fallback
}

func envIntOr(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}

func Setup(r *gin.Engine, pool *pgxpool.Pool) {
	api := r.Group("/api/v1")

	api.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	RegisterSetupRoutes(api, pool)

	protected := api.Group("")
	protected.Use(middleware.AuthMiddleware())
	// Layered on top of the per-IP RateLimit in cmd/api/main.go: isolates
	// one abusive signed-in account from the rest of a school that may
	// share one NAT IP. Same generous defaults as the per-IP limiter,
	// tunable independently via env.
	protected.Use(middleware.PerAccountRateLimit(
		envFloatOr("API_PER_ACCOUNT_RATE_LIMIT_RPS", 30),
		envIntOr("API_PER_ACCOUNT_RATE_LIMIT_BURST", 60),
	))

	RegisterAuthRoutes(api, protected, pool)

	admin := protected.Group("")
	admin.Use(middleware.RequireRole("admin"))

	teacherOrAdmin := protected.Group("")
	teacherOrAdmin.Use(middleware.RequireRole("admin", "teacher"))

	parent := protected.Group("")
	parent.Use(middleware.RequireRole("parent"))

	student := protected.Group("")
	student.Use(middleware.RequireRole("student"))

	teacher := protected.Group("")
	teacher.Use(middleware.RequireRole("teacher"))

	RegisterSchoolRoutes(admin, teacherOrAdmin, protected, pool)
	RegisterGradeRoutes(admin, teacherOrAdmin, pool)
	RegisterHouseRoutes(admin, teacherOrAdmin, pool)
	RegisterSubjectRoutes(admin, teacherOrAdmin, pool)
	RegisterCurriculumRoutes(admin, protected, pool)
	RegisterEnrollmentRoutes(admin, teacherOrAdmin, protected, pool)
	RegisterStreamRoutes(admin, teacherOrAdmin, pool)
	RegisterClassRoutes(admin, teacherOrAdmin, pool)
	RegisterStudentRoutes(admin, teacherOrAdmin, pool)
	RegisterStudentPortfolioRoutes(teacherOrAdmin, pool)
	RegisterTeacherRoutes(admin, teacherOrAdmin, pool)
	RegisterAttendanceRoutes(teacherOrAdmin, pool)
	RegisterStaffAttendanceRoutes(admin, pool)
	RegisterGuardianRoutes(admin, teacherOrAdmin, pool)
	RegisterNonAcademicStaffRoutes(admin, teacherOrAdmin, pool)
	RegisterSectionHeadRoutes(admin, teacherOrAdmin, pool)
	RegisterPrefectRoutes(admin, teacherOrAdmin, pool)
	RegisterPositionRoutes(admin, teacherOrAdmin, pool)
	RegisterPromotionRoutes(admin, pool)
	RegisterTermRoutes(admin, protected, pool)
	RegisterTermMarkRoutes(teacherOrAdmin, pool)
	RegisterStudentSelfRoutes(student, pool)
	RegisterTeacherSelfRoutes(teacher, pool)
	RegisterAuditRoutes(admin, pool)
	RegisterIdentityReconciliationRoutes(admin, pool)
	RegisterDashboardRoutes(admin, pool)
	RegisterReportExportRoutes(admin, pool)

	timetableroutes.RegisterClassroomRoutes(admin, teacherOrAdmin, pool)
	timetableroutes.RegisterGradeSectionRoutes(admin, teacherOrAdmin, pool)
	timetableroutes.RegisterTimetableSettingsRoutes(admin, pool)
	timetableroutes.RegisterSubjectPeriodRequirementRoutes(admin, teacherOrAdmin, pool)
	timetableroutes.RegisterTeacherAvailabilityRoutes(admin, teacherOrAdmin, pool)
	notificationroutes.RegisterNotificationRoutes(teacherOrAdmin, protected, pool)
	timetableService := timetableroutes.RegisterTimetableRoutes(admin, teacherOrAdmin, teacher, student, pool)

	RegisterParentRoutes(parent, timetableService, pool)

	meHandler := handlers.NewMeHandler(services.NewMeService(repositories.NewUserRepository(pool)))
	protected.GET("/me", meHandler.Get)
}
