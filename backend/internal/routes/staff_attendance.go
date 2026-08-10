package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

func RegisterStaffAttendanceRoutes(teacherOrAdmin *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewStaffAttendanceRepository(pool)
	service := services.NewStaffAttendanceService(repo)
	handler := handlers.NewStaffAttendanceHandler(service)

	teacherOrAdmin.POST("/staff-attendance", handler.Mark)
	teacherOrAdmin.GET("/staff-attendance", handler.ListByDate)
	teacherOrAdmin.GET("/staff-attendance/monthly-summary", handler.MonthlySummary)
	teacherOrAdmin.GET("/staff-attendance/teachers/:id/history", handler.TeacherHistory)
	teacherOrAdmin.GET("/staff-attendance/non-academic-staff/:id/history", handler.NonAcademicStaffHistory)
}
