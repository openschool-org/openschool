package middleware

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/apierror"
	"github.com/openschool-org/openschool/internal/authz"
	"github.com/openschool-org/openschool/internal/ports"
)

// RequireClassAccess lets admins through and teachers only for a class (named by param) they teach or lead.
func RequireClassAccess(access ports.ClassAccess, param string) gin.HandlerFunc {
	return requireAccess(param, func(ctx context.Context, user, class uuid.UUID) (bool, error) {
		return access.CanAccessClass(ctx, user, class)
	})
}

// RequireStudentWorkAccess lets admins through and teachers only for a student (named by param) in a class they teach or lead.
func RequireStudentWorkAccess(access ports.ClassAccess, param string) gin.HandlerFunc {
	return requireAccess(param, func(ctx context.Context, user, student uuid.UUID) (bool, error) {
		return access.CanAccessStudent(ctx, user, student)
	})
}

func requireAccess(param string, allowed func(context.Context, uuid.UUID, uuid.UUID) (bool, error)) gin.HandlerFunc {
	return func(c *gin.Context) {
		if HasRole(c, authz.RoleAdmin) {
			c.Next()
			return
		}
		userID, err := UserIDFromContext(c)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid user id"})
			return
		}
		id, err := uuid.Parse(c.Param(param))
		if err != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
			return
		}
		ok, err := allowed(c.Request.Context(), userID, id)
		if err != nil {
			apierror.RespondInternal(c, err)
			c.Abort()
			return
		}
		if !ok {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "you can only work with classes you teach or lead"})
			return
		}
		c.Next()
	}
}
