package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

func RegisterStudentRoutes(admin *gin.RouterGroup, teacherOrAdmin *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewStudentRepository(pool)
	houseSvc := services.NewHouseService(
		repositories.NewHouseRepository(pool),
		repo,
		repositories.NewTeacherRepository(pool),
		services.NewAuditService(repositories.NewAuditRepository(pool)),
	)
	service := services.NewStudentService(repo, newIdentityProvider(), houseSvc)
	handler := handlers.NewStudentHandler(service)

	admin.POST("/students", handler.Create)
	teacherOrAdmin.GET("/students", handler.List)
	teacherOrAdmin.GET("/students/:id", handler.GetByID)
	teacherOrAdmin.GET("/students/:id/class", handler.GetWithClass)
	admin.PUT("/students/:id", handler.Update)
	admin.PUT("/students/:id/house", handler.UpdateHouse)
	admin.PUT("/students/:id/enrollment-status", handler.UpdateEnrollmentStatus)
	admin.DELETE("/students/:id", handler.Delete)

	teacherOrAdmin.GET("/classes/:id/students", handler.ListByClass)
}
