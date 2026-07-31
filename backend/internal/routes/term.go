package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

// RegisterTermRoutes takes `anyRole` (any authenticated user, regardless of
// role) for the two read endpoints — term names/dates aren't sensitive, and
// parents need to list terms to pick which one to view their child's marks
// for, same as teachers/admins.
func RegisterTermRoutes(admin *gin.RouterGroup, anyRole *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewTermRepository(pool)
	service := services.NewTermService(repo)
	handler := handlers.NewTermHandler(service)

	admin.POST("/terms", handler.Create)
	anyRole.GET("/terms", handler.ListByAcademicYear)
	anyRole.GET("/terms/current", handler.GetCurrent)
	admin.PUT("/terms/:id/set-current", handler.SetCurrent)
	admin.PUT("/terms/:id", handler.Update)
	admin.DELETE("/terms/:id", handler.Delete)
}
