package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

// RegisterStaffAttendanceRoutes registers on the admin-only group: there is
// no legitimate teacher-facing use case for marking or reading a
// colleague's HR attendance/leave record (see docs/plan.md §0.1).
func RegisterStaffAttendanceRoutes(admin *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewStaffAttendanceRepository(pool)
	service := services.NewStaffAttendanceService(repo)
	handler := handlers.NewStaffAttendanceHandler(service)

	admin.POST("/staff-attendance", handler.Mark)
	admin.GET("/staff-attendance", handler.ListByDate)
	admin.GET("/staff-attendance/monthly-summary", handler.MonthlySummary)
	admin.GET("/staff-attendance/teachers/:id/history", handler.TeacherHistory)
	admin.GET("/staff-attendance/non-academic-staff/:id/history", handler.NonAcademicStaffHistory)
}
