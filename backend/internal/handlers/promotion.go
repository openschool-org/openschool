package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/services"
)

type PromotionHandler struct {
	service *services.PromotionService
}

func NewPromotionHandler(service *services.PromotionService) *PromotionHandler {
	return &PromotionHandler{service: service}
}

// Preview godoc
// @Summary      Preview promotion/reassignment for an academic year transition
// @Description  Computes next-grade + suggested target class per student — no writes
// @Tags         promotion
// @Produce      json
// @Param        source_year_id  query string true  "Source academic year UUID"
// @Param        target_year_id  query string true  "Target academic year UUID"
// @Param        rank_by_term_id query string false "Term UUID to sort by total marks"
// @Success      200 {array} models.PromotionPreviewRow
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /promotion/preview [get]
func (h *PromotionHandler) Preview(c *gin.Context) {
	sourceYearID, err := uuid.Parse(c.Query("source_year_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "a valid source_year_id is required"})
		return
	}
	targetYearID, err := uuid.Parse(c.Query("target_year_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "a valid target_year_id is required"})
		return
	}

	var rankByTermID *uuid.UUID
	if raw := c.Query("rank_by_term_id"); raw != "" {
		id, err := uuid.Parse(raw)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid rank_by_term_id"})
			return
		}
		rankByTermID = &id
	}

	rows, err := h.service.Preview(c.Request.Context(), sourceYearID, targetYearID, rankByTermID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, rows)
}

// Commit godoc
// @Summary      Commit class assignments for an academic year
// @Description  Bulk-writes class_students rows — shared by promotion-commit and general reassignment/shuffle
// @Tags         promotion
// @Accept       json
// @Produce      json
// @Param        request body models.CommitAssignmentsRequest true "Assignments"
// @Success      200 {object} map[string]int
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /promotion/commit [post]
func (h *PromotionHandler) Commit(c *gin.Context) {
	var req models.CommitAssignmentsRequest
	if err := bindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	count, err := h.service.CommitAssignments(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"assigned": count})
}
