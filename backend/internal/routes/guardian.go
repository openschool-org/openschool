package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

func RegisterGuardianRoutes(admin *gin.RouterGroup, teacherOrAdmin *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewGuardianRepository(pool)
	service := services.NewGuardianService(repo)
	handler := handlers.NewGuardianHandler(service)

	admin.POST("/guardians", handler.Create)
	teacherOrAdmin.GET("/guardians/:id", handler.GetByID)
	admin.PUT("/guardians/:id", handler.Update)
	admin.POST("/students/:id/guardians", handler.LinkToStudent)
	admin.DELETE("/students/:id/guardians/:guardian_id", handler.UnlinkFromStudent)
	teacherOrAdmin.GET("/students/:id/guardians", handler.ListByStudent)
	admin.PUT("/students/:id/guardians/:guardian_id/set-primary", handler.SetPrimaryContact)
}
