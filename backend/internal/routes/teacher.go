package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
	"github.com/openschool-org/openschool/internal/thunderid"
)

func RegisterTeacherRoutes(r *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewTeacherRepository(pool)
	thunderIDClient := thunderid.NewClient()
	service := services.NewTeacherService(repo, thunderIDClient)
	handler := handlers.NewTeacherHandler(service)

	r.POST("/teachers", handler.Create)
	r.GET("/teachers", handler.List)
	r.GET("/teachers/:id", handler.GetByID)
	r.PUT("/teachers/:id", handler.Update)
	r.DELETE("/teachers/:id", handler.Delete)
	r.POST("/teachers/:id/subjects", handler.AssignSubject)
	r.DELETE("/teachers/:id/subjects/:subject_id", handler.RemoveSubject)
	r.GET("/teachers/:id/subjects", handler.ListSubjects)
}
