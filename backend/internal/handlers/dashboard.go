package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/openschool-org/openschool/internal/services"
)

type DashboardHandler struct {
	service *services.DashboardService
}

func NewDashboardHandler(service *services.DashboardService) *DashboardHandler {
	return &DashboardHandler{service: service}
}

// Analytics godoc
// @Summary      Admin dashboard analytics
// @Description  Composed student/staff/academic/school analytics for the current academic year and term
// @Tags         dashboard
// @Produce      json
// @Success      200 {object} models.DashboardAnalyticsResponse
// @Failure      500 {object} map[string]string
// @Security     BearerAuth
// @Router       /dashboard/analytics [get]
func (h *DashboardHandler) Analytics(c *gin.Context) {
	analytics, err := h.service.Analytics(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, analytics)
}
