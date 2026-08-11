package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/services"
)

type StudentPortfolioHandler struct {
	service *services.StudentPortfolioService
}

func NewStudentPortfolioHandler(service *services.StudentPortfolioService) *StudentPortfolioHandler {
	return &StudentPortfolioHandler{service: service}
}

func studentIDParam(c *gin.Context) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student id"})
		return uuid.UUID{}, false
	}
	return id, true
}

func recordIDParam(c *gin.Context) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Param("record_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid record id"})
		return uuid.UUID{}, false
	}
	return id, true
}

// optionalActorID returns the caller's user id, or nil if the claim is
// missing/invalid — several portfolio writes credit an actor optionally.
func optionalActorID(c *gin.Context) *uuid.UUID {
	id, err := uuid.Parse(c.GetString("userID"))
	if err != nil {
		return nil
	}
	return &id
}

// --- Progress reports -------------------------------------------------------

// CreateProgressReport godoc
// @Summary      Add a progress report
// @Tags         student-portfolio
// @Accept       json
// @Produce      json
// @Param        id path string true "Student ID"
// @Param        request body models.CreateProgressReportRequest true "Report"
// @Success      201 {object} map[string]interface{}
// @Security     BearerAuth
// @Router       /students/{id}/progress-reports [post]
func (h *StudentPortfolioHandler) CreateProgressReport(c *gin.Context) {
	studentID, ok := studentIDParam(c)
	if !ok {
		return
	}
	var req models.CreateProgressReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var writtenBy *uuid.UUID
	if callerID, err := uuid.Parse(c.GetString("userID")); err == nil {
		writtenBy = h.service.TeacherProfileIDForUser(c.Request.Context(), callerID)
	}

	report, err := h.service.CreateProgressReport(c.Request.Context(), studentID, req, writtenBy)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, report)
}

// ListProgressReports godoc
// @Summary      List a student's progress reports
// @Tags         student-portfolio
// @Produce      json
// @Param        id path string true "Student ID"
// @Success      200 {array} map[string]interface{}
// @Security     BearerAuth
// @Router       /students/{id}/progress-reports [get]
func (h *StudentPortfolioHandler) ListProgressReports(c *gin.Context) {
	studentID, ok := studentIDParam(c)
	if !ok {
		return
	}
	reports, err := h.service.ListProgressReports(c.Request.Context(), studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, reports)
}

// UpdateProgressReport godoc
// @Summary      Update a progress report
// @Tags         student-portfolio
// @Accept       json
// @Produce      json
// @Param        id path string true "Student ID"
// @Param        record_id path string true "Report ID"
// @Param        request body models.UpdateProgressReportRequest true "Report"
// @Success      200 {object} map[string]interface{}
// @Security     BearerAuth
// @Router       /students/{id}/progress-reports/{record_id} [put]
func (h *StudentPortfolioHandler) UpdateProgressReport(c *gin.Context) {
	studentID, ok := studentIDParam(c)
	if !ok {
		return
	}
	id, ok := recordIDParam(c)
	if !ok {
		return
	}
	var req models.UpdateProgressReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	report, err := h.service.UpdateProgressReport(c.Request.Context(), id, studentID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, report)
}

// DeleteProgressReport godoc
// @Summary      Delete a progress report
// @Tags         student-portfolio
// @Produce      json
// @Param        id path string true "Student ID"
// @Param        record_id path string true "Report ID"
// @Success      200 {object} map[string]string
// @Security     BearerAuth
// @Router       /students/{id}/progress-reports/{record_id} [delete]
func (h *StudentPortfolioHandler) DeleteProgressReport(c *gin.Context) {
	studentID, ok := studentIDParam(c)
	if !ok {
		return
	}
	id, ok := recordIDParam(c)
	if !ok {
		return
	}
	if err := h.service.DeleteProgressReport(c.Request.Context(), id, studentID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "progress report deleted"})
}

// --- Activities --------------------------------------------------------------

// CreateActivity godoc
// @Summary      Add a student activity (club/sport/society/competition)
// @Tags         student-portfolio
// @Accept       json
// @Produce      json
// @Param        id path string true "Student ID"
// @Param        request body models.CreateActivityRequest true "Activity"
// @Success      201 {object} map[string]interface{}
// @Security     BearerAuth
// @Router       /students/{id}/activities [post]
func (h *StudentPortfolioHandler) CreateActivity(c *gin.Context) {
	studentID, ok := studentIDParam(c)
	if !ok {
		return
	}
	var req models.CreateActivityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	activity, err := h.service.CreateActivity(c.Request.Context(), studentID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, activity)
}

// ListActivities godoc
// @Summary      List a student's activities
// @Tags         student-portfolio
// @Produce      json
// @Param        id path string true "Student ID"
// @Success      200 {array} map[string]interface{}
// @Security     BearerAuth
// @Router       /students/{id}/activities [get]
func (h *StudentPortfolioHandler) ListActivities(c *gin.Context) {
	studentID, ok := studentIDParam(c)
	if !ok {
		return
	}
	activities, err := h.service.ListActivities(c.Request.Context(), studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, activities)
}

// UpdateActivity godoc
// @Summary      Update a student activity
// @Tags         student-portfolio
// @Accept       json
// @Produce      json
// @Param        id path string true "Student ID"
// @Param        record_id path string true "Activity ID"
// @Param        request body models.UpdateActivityRequest true "Activity"
// @Success      200 {object} map[string]interface{}
// @Security     BearerAuth
// @Router       /students/{id}/activities/{record_id} [put]
func (h *StudentPortfolioHandler) UpdateActivity(c *gin.Context) {
	studentID, ok := studentIDParam(c)
	if !ok {
		return
	}
	id, ok := recordIDParam(c)
	if !ok {
		return
	}
	var req models.UpdateActivityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	activity, err := h.service.UpdateActivity(c.Request.Context(), id, studentID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, activity)
}

// DeleteActivity godoc
// @Summary      Delete a student activity
// @Tags         student-portfolio
// @Produce      json
// @Param        id path string true "Student ID"
// @Param        record_id path string true "Activity ID"
// @Success      200 {object} map[string]string
// @Security     BearerAuth
// @Router       /students/{id}/activities/{record_id} [delete]
func (h *StudentPortfolioHandler) DeleteActivity(c *gin.Context) {
	studentID, ok := studentIDParam(c)
	if !ok {
		return
	}
	id, ok := recordIDParam(c)
	if !ok {
		return
	}
	if err := h.service.DeleteActivity(c.Request.Context(), id, studentID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "activity deleted"})
}

// --- Leadership roles ----------------------------------------------------------

// CreateLeadershipRole godoc
// @Summary      Add a student leadership role
// @Tags         student-portfolio
// @Accept       json
// @Produce      json
// @Param        id path string true "Student ID"
// @Param        request body models.CreateLeadershipRoleRequest true "Role"
// @Success      201 {object} map[string]interface{}
// @Security     BearerAuth
// @Router       /students/{id}/leadership-roles [post]
func (h *StudentPortfolioHandler) CreateLeadershipRole(c *gin.Context) {
	studentID, ok := studentIDParam(c)
	if !ok {
		return
	}
	var req models.CreateLeadershipRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	role, err := h.service.CreateLeadershipRole(c.Request.Context(), studentID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, role)
}

// ListLeadershipRoles godoc
// @Summary      List a student's leadership roles
// @Tags         student-portfolio
// @Produce      json
// @Param        id path string true "Student ID"
// @Success      200 {array} map[string]interface{}
// @Security     BearerAuth
// @Router       /students/{id}/leadership-roles [get]
func (h *StudentPortfolioHandler) ListLeadershipRoles(c *gin.Context) {
	studentID, ok := studentIDParam(c)
	if !ok {
		return
	}
	roles, err := h.service.ListLeadershipRoles(c.Request.Context(), studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, roles)
}

// DeleteLeadershipRole godoc
// @Summary      Delete a student leadership role
// @Tags         student-portfolio
// @Produce      json
// @Param        id path string true "Student ID"
// @Param        record_id path string true "Role ID"
// @Success      200 {object} map[string]string
// @Security     BearerAuth
// @Router       /students/{id}/leadership-roles/{record_id} [delete]
func (h *StudentPortfolioHandler) DeleteLeadershipRole(c *gin.Context) {
	studentID, ok := studentIDParam(c)
	if !ok {
		return
	}
	id, ok := recordIDParam(c)
	if !ok {
		return
	}
	if err := h.service.DeleteLeadershipRole(c.Request.Context(), id, studentID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "leadership role deleted"})
}

// --- Awards ------------------------------------------------------------------

// CreateAward godoc
// @Summary      Add a student award
// @Tags         student-portfolio
// @Accept       json
// @Produce      json
// @Param        id path string true "Student ID"
// @Param        request body models.CreateAwardRequest true "Award"
// @Success      201 {object} map[string]interface{}
// @Security     BearerAuth
// @Router       /students/{id}/awards [post]
func (h *StudentPortfolioHandler) CreateAward(c *gin.Context) {
	studentID, ok := studentIDParam(c)
	if !ok {
		return
	}
	var req models.CreateAwardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	award, err := h.service.CreateAward(c.Request.Context(), studentID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, award)
}

// ListAwards godoc
// @Summary      List a student's awards
// @Tags         student-portfolio
// @Produce      json
// @Param        id path string true "Student ID"
// @Success      200 {array} map[string]interface{}
// @Security     BearerAuth
// @Router       /students/{id}/awards [get]
func (h *StudentPortfolioHandler) ListAwards(c *gin.Context) {
	studentID, ok := studentIDParam(c)
	if !ok {
		return
	}
	awards, err := h.service.ListAwards(c.Request.Context(), studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, awards)
}

// DeleteAward godoc
// @Summary      Delete a student award
// @Tags         student-portfolio
// @Produce      json
// @Param        id path string true "Student ID"
// @Param        record_id path string true "Award ID"
// @Success      200 {object} map[string]string
// @Security     BearerAuth
// @Router       /students/{id}/awards/{record_id} [delete]
func (h *StudentPortfolioHandler) DeleteAward(c *gin.Context) {
	studentID, ok := studentIDParam(c)
	if !ok {
		return
	}
	id, ok := recordIDParam(c)
	if !ok {
		return
	}
	if err := h.service.DeleteAward(c.Request.Context(), id, studentID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "award deleted"})
}

// --- Disciplinary records -------------------------------------------------------

// CreateDisciplinaryRecord godoc
// @Summary      Add a disciplinary record
// @Tags         student-portfolio
// @Accept       json
// @Produce      json
// @Param        id path string true "Student ID"
// @Param        request body models.CreateDisciplinaryRecordRequest true "Record"
// @Success      201 {object} map[string]interface{}
// @Security     BearerAuth
// @Router       /students/{id}/disciplinary-records [post]
func (h *StudentPortfolioHandler) CreateDisciplinaryRecord(c *gin.Context) {
	studentID, ok := studentIDParam(c)
	if !ok {
		return
	}
	var req models.CreateDisciplinaryRecordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	record, err := h.service.CreateDisciplinaryRecord(c.Request.Context(), studentID, req, optionalActorID(c))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, record)
}

// ListDisciplinaryRecords godoc
// @Summary      List a student's disciplinary records
// @Tags         student-portfolio
// @Produce      json
// @Param        id path string true "Student ID"
// @Success      200 {array} map[string]interface{}
// @Security     BearerAuth
// @Router       /students/{id}/disciplinary-records [get]
func (h *StudentPortfolioHandler) ListDisciplinaryRecords(c *gin.Context) {
	studentID, ok := studentIDParam(c)
	if !ok {
		return
	}
	records, err := h.service.ListDisciplinaryRecords(c.Request.Context(), studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, records)
}

// DeleteDisciplinaryRecord godoc
// @Summary      Delete a disciplinary record
// @Tags         student-portfolio
// @Produce      json
// @Param        id path string true "Student ID"
// @Param        record_id path string true "Record ID"
// @Success      200 {object} map[string]string
// @Security     BearerAuth
// @Router       /students/{id}/disciplinary-records/{record_id} [delete]
func (h *StudentPortfolioHandler) DeleteDisciplinaryRecord(c *gin.Context) {
	studentID, ok := studentIDParam(c)
	if !ok {
		return
	}
	id, ok := recordIDParam(c)
	if !ok {
		return
	}
	if err := h.service.DeleteDisciplinaryRecord(c.Request.Context(), id, studentID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "disciplinary record deleted"})
}
