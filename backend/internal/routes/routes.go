package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
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
	RegisterGradeSubjectRoutes(admin, pool)
	RegisterStreamRoutes(admin, pool)
	RegisterClassRoutes(admin, teacherOrAdmin, pool)
	RegisterStudentRoutes(admin, teacherOrAdmin, pool)
	RegisterTeacherRoutes(admin, pool)
	RegisterAttendanceRoutes(teacherOrAdmin, pool)

	protected.GET("/me", func(c *gin.Context) {
		userID := c.GetString("userID")
		email := c.GetString("email")
		givenName := c.GetString("given_name")
		familyName := c.GetString("family_name")
		roles, _ := c.Get("roles")
		roleList := roles.([]string)

		// determine role
		role := "admin"
		for _, r := range roleList {
			if r == "teacher" {
				role = "teacher"
				break
			}
			if r == "student" {
				role = "student"
				break
			}
		}

		// auto-insert user into users table if not exists
		parsedID, err := uuid.Parse(userID)
		if err == nil {
			queries := db.New(pool)
			_, err = queries.GetUserByID(c.Request.Context(), parsedID)
			if err != nil {
				// user doesn't exist, insert
				fullName := c.GetString("given_name") + " " + c.GetString("family_name")
				_, _ = queries.CreateUser(c.Request.Context(), db.CreateUserParams{
					ID:       parsedID,
					Email:    email,
					FullName: fullName,
					Role:     role,
				})
			}
		}

		c.JSON(200, gin.H{
			"user_id":      userID,
			"email":        email,
			"username":     c.GetString("username"),
			"given_name":   givenName,
			"family_name":  familyName,
			"phone_number": c.GetString("phone_number"),
			"roles":        roles,
		})
	})
}
