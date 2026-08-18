// This file defines the RegisterPrefectRoutes function, mapping prefect assignments and student prefect appointments to their handlers.

package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

func RegisterPrefectRoutes(admin *gin.RouterGroup, teacherOrAdmin *gin.RouterGroup, studentAccess *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewPrefectRepository(pool)
	service := services.NewPrefectService(repo)
	handler := handlers.NewPrefectHandler(service)

	admin.PUT("/prefects", handler.Assign)
	teacherOrAdmin.GET("/prefects", handler.List)
	teacherOrAdmin.GET("/prefects/years", handler.ListYears)
	studentAccess.GET("/students/:id/prefect-appointments", handler.ListByStudent)
	admin.DELETE("/prefects/:id", handler.Delete)
}
