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
	attendanceService := services.NewAttendanceService(repositories.NewAttendanceRepository(pool), repositories.NewUserRepository(pool), repositories.NewTeacherRepository(pool), repositories.NewClassRepository(pool))
	marksService := services.NewTermMarkService(repositories.NewTermMarkRepository(pool), repositories.NewTeacherRepository(pool), repositories.NewClassRepository(pool))
	enrollmentService := services.NewEnrollmentService(repositories.NewEnrollmentRepository(pool), repositories.NewCurriculumRepository(pool))

	handler := handlers.NewStudentSelfHandler(studentsRepo, attendanceService, marksService, enrollmentService)

	student.GET("/me/student", handler.Profile)
	student.GET("/me/student/attendance", handler.Attendance)
	student.GET("/me/student/marks", handler.Marks)
	student.GET("/me/student/enrollments", handler.ListEnrollments)
	student.POST("/me/student/enrollments", handler.SubmitEnrollment)
	student.POST("/me/student/enrollments/confirm", handler.ConfirmEnrollment)
}
