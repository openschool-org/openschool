package timetable

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	handlers "github.com/openschool-org/openschool/internal/handlers/timetable"
	repositories "github.com/openschool-org/openschool/internal/repositories/timetable"
	services "github.com/openschool-org/openschool/internal/services/timetable"
)

func RegisterClassroomRoutes(admin *gin.RouterGroup, teacherOrAdmin *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewClassroomRepository(pool)
	service := services.NewClassroomService(repo)
	handler := handlers.NewClassroomHandler(service)

	admin.POST("/classrooms", handler.Create)
	teacherOrAdmin.GET("/classrooms", handler.List)
	admin.PUT("/classrooms/:id", handler.Update)
	admin.DELETE("/classrooms/:id", handler.Delete)
}
