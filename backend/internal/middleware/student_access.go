// This file defines the RequireStudentAccess middleware, which authorizes access to a student's resources based on the user's role (admin, teacher, student requesting their own profile, or guardian requesting their child's profile).

package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

func RequireStudentAccess(pool *pgxpool.Pool) gin.HandlerFunc {
	queries := db.New(pool)
	return func(c *gin.Context) {
		userIDStr, exists := c.Get("userID")
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}
		userID, err := uuid.Parse(userIDStr.(string))
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid user id"})
			return
		}

		userRoles, exists := c.Get("roles")
		if !exists {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "no roles found"})
			return
		}
		userRoleList, ok := userRoles.([]string)
		if !ok {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "invalid roles format"})
			return
		}

		for _, role := range userRoleList {
			if role == "admin" || role == "teacher" {
				c.Next()
				return
			}
		}

		studentIDStr := c.Param("id")
		if studentIDStr == "" {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "missing student id"})
			return
		}
		studentID, err := uuid.Parse(studentIDStr)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "invalid student id"})
			return
		}

		for _, role := range userRoleList {
			if role == "student" {
				student, err := queries.GetStudentByUserID(c.Request.Context(), pgtype.UUID{Bytes: userID, Valid: true})
				if err == nil && student.ID == studentID {
					c.Next()
					return
				}
			}
		}

		for _, role := range userRoleList {
			if role == "parent" {
				isGuardian, err := queries.IsGuardianOfStudent(c.Request.Context(), db.IsGuardianOfStudentParams{
					UserID:    pgtype.UUID{Bytes: userID, Valid: true},
					StudentID: studentID,
				})
				if err == nil && isGuardian {
					c.Next()
					return
				}
			}
		}

		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "access denied for this student resource"})
	}
}
