package httpx

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ParamUUID parses a path parameter as a UUID. On failure it writes a 400 with message and returns false.
func ParamUUID(c *gin.Context, name, message string) (uuid.UUID, bool) {
	return parseUUID(c, c.Param(name), message)
}

// QueryUUID parses a query parameter as a UUID. On failure it writes a 400 with message and returns false.
func QueryUUID(c *gin.Context, name, message string) (uuid.UUID, bool) {
	return parseUUID(c, c.Query(name), message)
}

func parseUUID(c *gin.Context, raw, message string) (uuid.UUID, bool) {
	id, err := uuid.Parse(raw)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": message})
		return uuid.Nil, false
	}
	return id, true
}
