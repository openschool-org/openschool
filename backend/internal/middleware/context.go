package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// UserIDFromContext parses the "userID" set by AuthMiddleware into a UUID.
func UserIDFromContext(c *gin.Context) (uuid.UUID, error) {
	return uuid.Parse(c.GetString("userID"))
}
