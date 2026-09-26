package audit

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/apierror"
	"github.com/openschool-org/openschool/internal/platform/httpx"
)

func RegisterRoutes(admin *gin.RouterGroup, service *Service) {
	admin.GET("/audit-logs/entity-types", func(c *gin.Context) {
		types, err := service.EntityTypes(c)
		if err != nil {
			apierror.RespondInternal(c, err)
			return
		}
		c.JSON(http.StatusOK, types)
	})
	admin.GET("/audit-logs", func(c *gin.Context) {
		entityType := c.Query("entity_type")
		var entityID *uuid.UUID
		if raw := c.Query("entity_id"); raw != "" {
			parsed, err := uuid.Parse(raw)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid entity_id"})
				return
			}
			entityID = &parsed
		}
		page := httpx.ParsePage(c)
		filter := ListFilter{EntityType: entityType, EntityID: entityID, Search: page.Search, Limit: page.Limit, Offset: page.Offset}
		for key, target := range map[string]**time.Time{"from": &filter.From, "to": &filter.To} {
			if raw := c.Query(key); raw != "" {
				parsed, err := time.Parse("2006-01-02", raw)
				if err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": "invalid " + key + " (expected YYYY-MM-DD)"})
					return
				}
				*target = &parsed
			}
		}
		logs, total, err := service.List(c, filter)
		if err != nil {
			apierror.RespondInternal(c, err)
			return
		}
		c.JSON(http.StatusOK, httpx.Page[AuditLogResponse]{Items: logs, Total: total, Limit: page.Limit, Offset: page.Offset})
	})
}
