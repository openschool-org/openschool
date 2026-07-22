package routes

import (
	"log"

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

	RegisterSchoolRoutes(admin, teacherOrAdmin, pool)
	RegisterGradeRoutes(admin, teacherOrAdmin, pool)
	RegisterHouseRoutes(admin, teacherOrAdmin, pool)
	RegisterSubjectRoutes(admin, teacherOrAdmin, pool)
	RegisterCurriculumRoutes(admin, protected, pool)
	RegisterEnrollmentRoutes(admin, teacherOrAdmin, protected, pool)
	RegisterStreamRoutes(admin, pool)
	RegisterClassRoutes(admin, teacherOrAdmin, pool)
	RegisterStudentRoutes(admin, teacherOrAdmin, pool)
	RegisterTeacherRoutes(admin, teacherOrAdmin, pool)
	RegisterAttendanceRoutes(teacherOrAdmin, pool)
	RegisterGuardianRoutes(admin, teacherOrAdmin, pool)

	protected.GET("/me", func(c *gin.Context) {
		userID := c.GetString("userID")
		email := c.GetString("email")
		givenName := c.GetString("given_name")
		familyName := c.GetString("family_name")
		roles, _ := c.Get("roles")
		roleList := roles.([]string)

		role := ""
		for _, candidate := range []string{"admin", "teacher", "student", "parent"} {
			for _, r := range roleList {
				if r == candidate {
					role = candidate
				}
			}
			if role != "" {
				break
			}
		}

		// auto-insert user into users table if not exists
		parsedID, err := uuid.Parse(userID)
		if err == nil && role != "" {
			queries := db.New(pool)
			_, err = queries.GetUserByID(c.Request.Context(), parsedID)
			if err != nil {
				// user doesn't exist, insert
				fullName := c.GetString("given_name") + " " + c.GetString("family_name")
				if _, err := queries.CreateUser(c.Request.Context(), db.CreateUserParams{
					ID:       parsedID,
					Email:    email,
					FullName: fullName,
					Role:     role,
				}); err != nil {
					log.Printf("/me: failed to provision local user %s: %v", parsedID, err)
				}
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
