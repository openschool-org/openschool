package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

func RegisterGradeSubjectRoutes(r *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewGradeSubjectRepository(pool)
	service := services.NewGradeSubjectService(repo)
	handler := handlers.NewGradeSubjectHandler(service)

	r.POST("/grades/:id/subjects", handler.AssignSubjectToGrade)
	r.DELETE("/grades/:id/subjects/:subject_id", handler.RemoveSubjectFromGrade)
	r.GET("/grades/:id/subjects", handler.ListSubjectsByGrade)

	r.POST("/grades/:id/buckets", handler.CreateSubjectBucket)
	r.GET("/grades/:id/buckets", handler.ListSubjectBuckets)
	r.POST("/grades/:id/buckets/:bucket_id/subjects", handler.AddSubjectToBucket)
	r.GET("/grades/:id/buckets/:bucket_id/subjects", handler.ListBucketOptions)
}
