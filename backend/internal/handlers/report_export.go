package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/services"
)

type ReportExportHandler struct {
	service *services.ReportExportService
}

func NewReportExportHandler(service *services.ReportExportService) *ReportExportHandler {
	return &ReportExportHandler{service: service}
}

// ExportAttendance godoc
// @Summary      Export an attendance report as PDF
// @Description  One row per attendance record for the class across the given date range; columns is an optional comma-separated subset
// @Tags         reports
// @Produce      application/pdf
// @Param        class_id query string true "Class UUID"
// @Param        from     query string true "Start date (YYYY-MM-DD)"
// @Param        to       query string true "End date (YYYY-MM-DD)"
// @Param        columns  query []string false "Column subset"
// @Success      200 {file} binary
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /reports/attendance [get]
func (h *ReportExportHandler) ExportAttendance(c *gin.Context) {
	var req models.AttendanceReportRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	pdfBytes, err := h.service.ExportAttendance(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.Header("Content-Disposition", `attachment; filename="attendance-report.pdf"`)
	c.Data(http.StatusOK, "application/pdf", pdfBytes)
}

// ExportMarks godoc
// @Summary      Export a marks report as PDF
// @Description  One row per student's mark for the given class/term/subject; columns is an optional comma-separated subset
// @Tags         reports
// @Produce      application/pdf
// @Param        class_id   query string true "Class UUID"
// @Param        term_id    query string true "Term UUID"
// @Param        subject_id query string true "Subject UUID"
// @Param        columns    query []string false "Column subset"
// @Success      200 {file} binary
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /reports/marks [get]
func (h *ReportExportHandler) ExportMarks(c *gin.Context) {
	var req models.MarksReportRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	pdfBytes, err := h.service.ExportMarks(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.Header("Content-Disposition", `attachment; filename="marks-report.pdf"`)
	c.Data(http.StatusOK, "application/pdf", pdfBytes)
}
