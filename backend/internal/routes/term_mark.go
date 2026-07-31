package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

func RegisterTermMarkRoutes(teacherOrAdmin *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewTermMarkRepository(pool)
	teacherRepo := repositories.NewTeacherRepository(pool)
	classRepo := repositories.NewClassRepository(pool)
	service := services.NewTermMarkService(repo, teacherRepo, classRepo)
	handler := handlers.NewTermMarkHandler(service)

	teacherOrAdmin.PUT("/classes/:id/marks", handler.BulkUpsert)
	teacherOrAdmin.GET("/classes/:id/marks", handler.ListClassMarks)
	teacherOrAdmin.GET("/students/:id/marks", handler.ListStudentMarks)
	teacherOrAdmin.DELETE("/marks/:id", handler.DeleteMark)
}
