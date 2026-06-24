package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/middleware"
)

func Setup(r *gin.Engine, pool *pgxpool.Pool) {
	api := r.Group("/api/v1")

	api.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	protected := api.Group("")
	protected.Use(middleware.AuthMiddleware())

	admin := protected.Group("")
	admin.Use(middleware.RequireRole("admin"))

	RegisterSchoolRoutes(admin, pool)
	RegisterGradeRoutes(admin, pool)
	RegisterSubjectRoutes(admin, pool)
	RegisterStreamRoutes(admin, pool)
	RegisterClassRoutes(admin, pool)

	teacherOrAdmin := protected.Group("")
	teacherOrAdmin.Use(middleware.RequireRole("admin", "teacher"))

	protected.GET("/me", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "coming soon"})
	})
}
