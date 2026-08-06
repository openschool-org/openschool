package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

// RegisterStudentPortfolioRoutes wires up the Phase 6.3 net-new portfolio
// tables (progress reports, activities, leadership roles, awards,
// disciplinary records). teacherOrAdmin can read and write; the read-only
// rollups of data that already lives elsewhere (attendance, marks, prefect
// appointments, house) reuse their existing endpoints — nothing new needed.
func RegisterStudentPortfolioRoutes(teacherOrAdmin *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewStudentPortfolioRepository(pool)
	service := services.NewStudentPortfolioService(repo, repositories.NewTeacherRepository(pool))
	handler := handlers.NewStudentPortfolioHandler(service)

	teacherOrAdmin.POST("/students/:id/progress-reports", handler.CreateProgressReport)
	teacherOrAdmin.GET("/students/:id/progress-reports", handler.ListProgressReports)
	teacherOrAdmin.PUT("/students/:id/progress-reports/:record_id", handler.UpdateProgressReport)
	teacherOrAdmin.DELETE("/students/:id/progress-reports/:record_id", handler.DeleteProgressReport)

	teacherOrAdmin.POST("/students/:id/activities", handler.CreateActivity)
	teacherOrAdmin.GET("/students/:id/activities", handler.ListActivities)
	teacherOrAdmin.PUT("/students/:id/activities/:record_id", handler.UpdateActivity)
	teacherOrAdmin.DELETE("/students/:id/activities/:record_id", handler.DeleteActivity)

	teacherOrAdmin.POST("/students/:id/leadership-roles", handler.CreateLeadershipRole)
	teacherOrAdmin.GET("/students/:id/leadership-roles", handler.ListLeadershipRoles)
	teacherOrAdmin.DELETE("/students/:id/leadership-roles/:record_id", handler.DeleteLeadershipRole)

	teacherOrAdmin.POST("/students/:id/awards", handler.CreateAward)
	teacherOrAdmin.GET("/students/:id/awards", handler.ListAwards)
	teacherOrAdmin.DELETE("/students/:id/awards/:record_id", handler.DeleteAward)

	teacherOrAdmin.POST("/students/:id/disciplinary-records", handler.CreateDisciplinaryRecord)
	teacherOrAdmin.GET("/students/:id/disciplinary-records", handler.ListDisciplinaryRecords)
	teacherOrAdmin.DELETE("/students/:id/disciplinary-records/:record_id", handler.DeleteDisciplinaryRecord)
}
