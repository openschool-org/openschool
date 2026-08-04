package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

func RegisterTeacherSelfRoutes(teacher *gin.RouterGroup, pool *pgxpool.Pool) {
	teacherRepo := repositories.NewTeacherRepository(pool)
	schoolRepo := repositories.NewSchoolRepository(pool)
	positionService := services.NewPositionService(repositories.NewPositionRepository(pool), repositories.NewSectionHeadRepository(pool))
	handler := handlers.NewTeacherSelfHandler(teacherRepo, schoolRepo, positionService)

	teacher.GET("/me/teacher", handler.Profile)
	teacher.GET("/me/teacher/position", handler.Position)
}
