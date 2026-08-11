package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	notificationsrepositories "github.com/openschool-org/openschool/internal/repositories/notifications"
	timetablerepositories "github.com/openschool-org/openschool/internal/repositories/timetable"
	"github.com/openschool-org/openschool/internal/services"
	notificationsservices "github.com/openschool-org/openschool/internal/services/notifications"
)

func RegisterAttendanceRoutes(teacherOrAdmin *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewAttendanceRepository(pool)
	userRepo := repositories.NewUserRepository(pool)
	teacherRepo := repositories.NewTeacherRepository(pool)
	classRepo := repositories.NewClassRepository(pool)
	studentRepo := repositories.NewStudentRepository(pool)
	guardianRepo := repositories.NewGuardianRepository(pool)
	notifications := notificationsservices.NewNotificationService(
		notificationsrepositories.NewNotificationRepository(pool),
		classRepo,
		timetablerepositories.NewGradeSectionRepository(pool),
		repositories.NewSectionHeadRepository(pool),
		teacherRepo,
		studentRepo,
		guardianRepo,
		repositories.NewSchoolRepository(pool),
		repositories.NewPositionRepository(pool),
	)
	auditSvc := services.NewAuditService(repositories.NewAuditRepository(pool))
	positionSvc := services.NewPositionService(repositories.NewPositionRepository(pool), repositories.NewSectionHeadRepository(pool), nil)
	schoolRepo := repositories.NewSchoolRepository(pool)
	service := services.NewAttendanceService(repo, userRepo, teacherRepo, classRepo, studentRepo, guardianRepo, notifications, auditSvc, positionSvc, schoolRepo)
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
