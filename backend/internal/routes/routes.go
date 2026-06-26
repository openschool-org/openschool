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

	teacherOrAdmin := protected.Group("")
	teacherOrAdmin.Use(middleware.RequireRole("admin", "teacher"))

	RegisterSchoolRoutes(admin, pool)
	RegisterGradeRoutes(admin, pool)
	RegisterSubjectRoutes(admin, pool)
	RegisterStreamRoutes(admin, pool)
	RegisterClassRoutes(admin, teacherOrAdmin, pool)
	RegisterStudentRoutes(admin, teacherOrAdmin, pool)
	RegisterTeacherRoutes(admin, pool)

	protected.GET("/me", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"user_id":      c.GetString("userID"),
			"email":        c.GetString("email"),
			"username":     c.GetString("username"),
			"given_name":   c.GetString("given_name"),
			"family_name":  c.GetString("family_name"),
			"phone_number": c.GetString("phone_number"),
			"roles":        c.MustGet("roles"),
		})
	})
}
