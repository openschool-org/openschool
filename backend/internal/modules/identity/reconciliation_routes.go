package identity

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/apierror"
	"github.com/openschool-org/openschool/internal/middleware"
)

type reconciliationHandler struct{ service *reconciliationService }

func newReconciliationHandler(service *reconciliationService) *reconciliationHandler {
	return &reconciliationHandler{service: service}
}

func (h *reconciliationHandler) listOrphaned(c *gin.Context) {
	orphaned, err := h.service.findOrphaned(c.Request.Context())
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, orphaned)
}

func (h *reconciliationHandler) deleteOrphaned(c *gin.Context) {
	actorID, err := middleware.UserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return
	}

	// The id goes into the identity provider's URL, so only a UUID is accepted.
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid account id"})
		return
	}
	if err := h.service.deleteOrphaned(c.Request.Context(), id.String(), actorID); err != nil {
		if errors.Is(err, ErrOrphanNoLongerOrphaned) {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "orphaned account deleted"})
}
