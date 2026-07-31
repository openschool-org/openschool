package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

func RegisterStudentSelfRoutes(student *gin.RouterGroup, pool *pgxpool.Pool) {
	studentsRepo := repositories.NewStudentRepository(pool)
	attendanceService := services.NewAttendanceService(repositories.NewAttendanceRepository(pool), repositories.NewUserRepository(pool))
	marksService := services.NewTermMarkService(repositories.NewTermMarkRepository(pool))

	handler := handlers.NewStudentSelfHandler(studentsRepo, attendanceService, marksService)

	student.GET("/me/student", handler.Profile)
	student.GET("/me/student/attendance", handler.Attendance)
	student.GET("/me/student/marks", handler.Marks)
}
