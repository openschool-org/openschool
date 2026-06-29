package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

func RegisterGuardianRoutes(r *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewGuardianRepository(pool)
	service := services.NewGuardianService(repo)
	handler := handlers.NewGuardianHandler(service)

	r.POST("/guardians", handler.Create)
	r.GET("/guardians/:id", handler.GetByID)
	r.PUT("/guardians/:id", handler.Update)
	r.POST("/students/:id/guardians", handler.LinkToStudent)
	r.DELETE("/students/:id/guardians/:guardian_id", handler.UnlinkFromStudent)
	r.GET("/students/:id/guardians", handler.ListByStudent)
	r.PUT("/students/:id/guardians/:guardian_id/set-primary", handler.SetPrimaryContact)
}
