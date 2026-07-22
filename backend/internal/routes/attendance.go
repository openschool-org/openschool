package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

func RegisterAttendanceRoutes(teacherOrAdmin *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewAttendanceRepository(pool)
	service := services.NewAttendanceService(repo)
	handler := handlers.NewAttendanceHandler(service)

	teacherOrAdmin.POST("/attendance/sessions", handler.CreateSession)
	teacherOrAdmin.GET("/attendance/sessions", handler.ListSessionsByDate)
	teacherOrAdmin.GET("/attendance/sessions/:id", handler.GetSession)
	teacherOrAdmin.DELETE("/attendance/sessions/:id", handler.DeleteSession)
	teacherOrAdmin.POST("/attendance/sessions/:id/records", handler.MarkAttendance)
	teacherOrAdmin.GET("/attendance/sessions/:id/records", handler.ListBySession)
	teacherOrAdmin.GET("/classes/:id/attendance/sessions", handler.ListSessionsByClass)
	teacherOrAdmin.GET("/students/:id/attendance", handler.ListByStudent)
	teacherOrAdmin.GET("/students/:id/attendance/summary/:class_id", handler.GetSummary)
}
