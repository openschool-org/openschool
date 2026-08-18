// This file defines the RegisterStudentPortfolioRoutes function, mapping student portfolio endpoints (progress reports, activities, leadership, awards, disciplinary records) to their corresponding handlers and middlewares.

package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

func RegisterStudentPortfolioRoutes(teacherOrAdmin *gin.RouterGroup, studentAccess *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewStudentPortfolioRepository(pool)
	service := services.NewStudentPortfolioService(repo, repositories.NewTeacherRepository(pool))
	handler := handlers.NewStudentPortfolioHandler(service)

	teacherOrAdmin.POST("/students/:id/progress-reports", handler.CreateProgressReport)
	studentAccess.GET("/students/:id/progress-reports", handler.ListProgressReports)
	teacherOrAdmin.PUT("/students/:id/progress-reports/:record_id", handler.UpdateProgressReport)
	teacherOrAdmin.DELETE("/students/:id/progress-reports/:record_id", handler.DeleteProgressReport)

	teacherOrAdmin.POST("/students/:id/activities", handler.CreateActivity)
	studentAccess.GET("/students/:id/activities", handler.ListActivities)
	teacherOrAdmin.PUT("/students/:id/activities/:record_id", handler.UpdateActivity)
	teacherOrAdmin.DELETE("/students/:id/activities/:record_id", handler.DeleteActivity)

	teacherOrAdmin.POST("/students/:id/leadership-roles", handler.CreateLeadershipRole)
	studentAccess.GET("/students/:id/leadership-roles", handler.ListLeadershipRoles)
	teacherOrAdmin.DELETE("/students/:id/leadership-roles/:record_id", handler.DeleteLeadershipRole)

	teacherOrAdmin.POST("/students/:id/awards", handler.CreateAward)
	studentAccess.GET("/students/:id/awards", handler.ListAwards)
	teacherOrAdmin.DELETE("/students/:id/awards/:record_id", handler.DeleteAward)

	teacherOrAdmin.POST("/students/:id/disciplinary-records", handler.CreateDisciplinaryRecord)
	studentAccess.GET("/students/:id/disciplinary-records", handler.ListDisciplinaryRecords)
	teacherOrAdmin.DELETE("/students/:id/disciplinary-records/:record_id", handler.DeleteDisciplinaryRecord)
}
