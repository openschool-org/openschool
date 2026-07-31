package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/openschool-org/openschool/internal/services"
)

type CurriculumPresetHandler struct {
	service *services.CurriculumPresetService
}

func NewCurriculumPresetHandler(service *services.CurriculumPresetService) *CurriculumPresetHandler {
	return &CurriculumPresetHandler{service: service}
}

// Preview godoc
// @Summary      Preview the Sri Lankan national curriculum preset
// @Description  Computes exactly what Run would create, without writing anything — for admin review before committing
// @Tags         curriculum
// @Produce      json
// @Success      200  {object}  services.PresetSummary
// @Failure      500  {object}  map[string]string
// @Security     BearerAuth
// @Router       /curriculum/preset/preview [get]
func (h *CurriculumPresetHandler) Preview(c *gin.Context) {
	summary, err := h.service.Preview(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, summary)
}

// Run godoc
// @Summary      Seed the Sri Lankan national curriculum
// @Description  Idempotently creates subjects, levels, and selection groups for the standard Grade 1-13 curriculum, scoped to whichever grades exist in this school
// @Tags         curriculum
// @Produce      json
// @Success      200  {object}  services.PresetSummary
// @Failure      500  {object}  map[string]string
// @Security     BearerAuth
// @Router       /curriculum/preset [post]
func (h *CurriculumPresetHandler) Run(c *gin.Context) {
	summary, err := h.service.Run(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, summary)
}
