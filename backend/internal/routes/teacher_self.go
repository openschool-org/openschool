package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
)

func RegisterTeacherSelfRoutes(teacher *gin.RouterGroup, pool *pgxpool.Pool) {
	teacherRepo := repositories.NewTeacherRepository(pool)
	handler := handlers.NewTeacherSelfHandler(teacherRepo)

	teacher.GET("/me/teacher", handler.Profile)
}
