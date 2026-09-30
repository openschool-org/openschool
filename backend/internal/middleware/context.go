package middleware

import (
	"net/http"
	"slices"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// UserIDFromContext parses the "userID" set by AuthMiddleware into a UUID.
func UserIDFromContext(c *gin.Context) (uuid.UUID, error) {
	return uuid.Parse(c.GetString("userID"))
}

// rolesFromContext reads the "roles" claim AuthMiddleware set on the context, aborting the request with 403 if it's missing or malformed.
func rolesFromContext(c *gin.Context) ([]string, bool) {
	userRoles, exists := c.Get("roles")
	if !exists {
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "no roles found"})
		return nil, false
	}
	roleList, ok := userRoles.([]string)
	if !ok {
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "invalid roles format"})
		return nil, false
	}
	return roleList, true
}

// HasRole reports whether the caller's JWT carries the role, without aborting the request.
func HasRole(c *gin.Context, role string) bool {
	roles, ok := c.Get("roles")
	list, isList := roles.([]string)
	return ok && isList && slices.Contains(list, role)
}
