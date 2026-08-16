package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/openschool-org/openschool/internal/services"
)

type SearchHandler struct {
	service *services.SearchService
}

func NewSearchHandler(service *services.SearchService) *SearchHandler {
	return &SearchHandler{service: service}
}

// Global godoc
// @Summary      Admin global search
// @Description  Bounded (top 5 per entity) name/identifier search across students, teachers, guardians, and non-academic staff, for the admin header's jump-to-record search
// @Tags         search
// @Produce      json
// @Param        q query string true "Search term"
// @Success      200 {object} models.GlobalSearchResponse
// @Failure      500 {object} map[string]string
// @Security     BearerAuth
// @Router       /admin/search [get]
func (h *SearchHandler) Global(c *gin.Context) {
	result, err := h.service.Global(c.Request.Context(), c.Query("q"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}
