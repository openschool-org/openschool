package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/openschool-org/openschool/internal/middleware"
)

func Setup(r *gin.Engine) {
	api := r.Group("/api/v1")

	api.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	protected := api.Group("")
	protected.Use(middleware.AuthMiddleware())
	{
		// admin only
		admin := protected.Group("")
		admin.Use(middleware.RequireRole("admin"))
		{
			// school setup
			admin.GET("/school", placeholder)
			admin.POST("/school", placeholder)

			// academic years
			admin.GET("/academic-years", placeholder)
			admin.POST("/academic-years", placeholder)

			// grades
			admin.GET("/grades", placeholder)
			admin.POST("/grades", placeholder)

			// classes
			admin.GET("/classes", placeholder)
			admin.POST("/classes", placeholder)

			// students
			admin.GET("/students", placeholder)
			admin.POST("/students", placeholder)
			admin.GET("/students/:id", placeholder)
			admin.PUT("/students/:id", placeholder)

			// teachers
			admin.GET("/teachers", placeholder)
			admin.POST("/teachers", placeholder)
			admin.GET("/teachers/:id", placeholder)
			admin.PUT("/teachers/:id", placeholder)

			// subjects
			admin.GET("/subjects", placeholder)
			admin.POST("/subjects", placeholder)
		}

		// teacher + admin
		teacherOrAdmin := protected.Group("")
		teacherOrAdmin.Use(middleware.RequireRole("admin", "teacher"))
		{
			// attendance
			teacherOrAdmin.POST("/attendance/sessions", placeholder)
			teacherOrAdmin.POST("/attendance/sessions/:id/records", placeholder)
			teacherOrAdmin.GET("/attendance/sessions/:id", placeholder)
			teacherOrAdmin.GET("/classes/:id/attendance", placeholder)
		}

		// all authenticated users
		protected.GET("/me", placeholder)
	}
}

// placeholder handler — replace with real handlers as we build them
func placeholder(c *gin.Context) {
	c.JSON(200, gin.H{"message": "coming soon"})
}
