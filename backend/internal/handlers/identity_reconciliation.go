package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/openschool-org/openschool/internal/services"
)

type IdentityReconciliationHandler struct {
	service *services.IdentityReconciliationService
}

func NewIdentityReconciliationHandler(service *services.IdentityReconciliationService) *IdentityReconciliationHandler {
	return &IdentityReconciliationHandler{service: service}
}

// ListOrphaned godoc
// @Summary      List orphaned identity provider accounts
// @Description  Admin-triggered: ThunderID accounts with no matching local users row, left behind by a failed signup rollback
// @Tags         identity
// @Produce      json
// @Success      200 {array} services.OrphanedIdentity
// @Failure      500 {object} map[string]string
// @Security     BearerAuth
// @Router       /admin/orphaned-accounts [get]
func (h *IdentityReconciliationHandler) ListOrphaned(c *gin.Context) {
	orphaned, err := h.service.FindOrphaned(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, orphaned)
}

// DeleteOrphaned godoc
// @Summary      Delete an orphaned identity provider account
// @Description  Admin-triggered cleanup; re-verifies the account is still orphaned immediately before deleting
// @Tags         identity
// @Produce      json
// @Param        id path string true "ThunderID user ID"
// @Success      200 {object} map[string]string
// @Failure      409 {object} map[string]string
// @Security     BearerAuth
// @Router       /admin/orphaned-accounts/{id} [delete]
func (h *IdentityReconciliationHandler) DeleteOrphaned(c *gin.Context) {
	id := c.Param("id")

	actor, err := actorFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.DeleteOrphaned(c.Request.Context(), id, actor.ID); err != nil {
		if errors.Is(err, services.ErrOrphanNoLongerOrphaned) {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "orphaned account deleted"})
}
