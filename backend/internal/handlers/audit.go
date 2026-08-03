package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/services"
)

// auditLogResponse mirrors db.ListAuditLogsRow but marshals before/after as
// raw JSON instead of the base64 string encoding/json would otherwise
// produce for a plain []byte field.
type auditLogResponse struct {
	ID         uuid.UUID       `json:"id"`
	EntityType string          `json:"entity_type"`
	EntityID   uuid.UUID       `json:"entity_id"`
	Action     string          `json:"action"`
	ActorID    *uuid.UUID      `json:"actor_id"`
	ActorName  *string         `json:"actor_name"`
	Before     json.RawMessage `json:"before"`
	After      json.RawMessage `json:"after"`
	Reason     *string         `json:"reason"`
	CreatedAt  string          `json:"created_at"`
}

func toAuditLogResponse(row db.ListAuditLogsRow) auditLogResponse {
	resp := auditLogResponse{
		ID:         row.ID,
		EntityType: row.EntityType,
		EntityID:   row.EntityID,
		Action:     row.Action,
		Before:     row.Before,
		After:      row.After,
		CreatedAt:  row.CreatedAt.Time.Format("2006-01-02T15:04:05Z07:00"),
	}
	if row.ActorID.Valid {
		id := uuid.UUID(row.ActorID.Bytes)
		resp.ActorID = &id
	}
	if row.ActorName.Valid {
		resp.ActorName = &row.ActorName.String
	}
	if row.Reason.Valid {
		resp.Reason = &row.Reason.String
	}
	return resp
}

type AuditHandler struct {
	service *services.AuditService
}

func NewAuditHandler(service *services.AuditService) *AuditHandler {
	return &AuditHandler{service: service}
}

// List godoc
// @Summary      List audit log entries
// @Description  Admin-only trail of manual house re-assignments and attendance edits made after the 24h lock
// @Tags         audit
// @Produce      json
// @Param        entity_type query string false "Filter by entity type"
// @Param        entity_id   query string false "Filter by entity id"
// @Security     BearerAuth
// @Router       /audit-logs [get]
func (h *AuditHandler) List(c *gin.Context) {
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

	logs, err := h.service.List(c.Request.Context(), entityType, entityID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	resp := make([]auditLogResponse, len(logs))
	for i, row := range logs {
		resp[i] = toAuditLogResponse(row)
	}

	c.JSON(http.StatusOK, resp)
}
