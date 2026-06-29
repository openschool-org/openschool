package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/services"
)

type GuardianHandler struct {
	service *services.GuardianService
}

func NewGuardianHandler(service *services.GuardianService) *GuardianHandler {
	return &GuardianHandler{service: service}
}

// Create godoc
// @Summary      Create guardian
// @Description  Create a new guardian record
// @Tags         guardians
// @Accept       json
// @Produce      json
// @Param        request body models.CreateGuardianRequest true "Guardian details"
// @Success      201 {object} models.GuardianResponse
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /guardians [post]
func (h *GuardianHandler) Create(c *gin.Context) {
	var req models.CreateGuardianRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	guardian, err := h.service.CreateGuardian(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, guardian)
}

// GetByID godoc
// @Summary      Get guardian by ID
// @Description  Get a guardian record by ID
// @Tags         guardians
// @Produce      json
// @Param        id path string true "Guardian ID"
// @Success      200 {object} models.GuardianResponse
// @Failure      404 {object} map[string]string
// @Security     BearerAuth
// @Router       /guardians/{id} [get]
func (h *GuardianHandler) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	guardian, err := h.service.GetGuardian(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "guardian not found"})
		return
	}

	c.JSON(http.StatusOK, guardian)
}

// Update godoc
// @Summary      Update guardian
// @Description  Update a guardian record
// @Tags         guardians
// @Accept       json
// @Produce      json
// @Param        id path string true "Guardian ID"
// @Param        request body models.UpdateGuardianRequest true "Guardian details"
// @Success      200 {object} models.GuardianResponse
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /guardians/{id} [put]
func (h *GuardianHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req models.UpdateGuardianRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	guardian, err := h.service.UpdateGuardian(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, guardian)
}

// LinkToStudent godoc
// @Summary      Link guardian to student
// @Description  Link an existing guardian to a student
// @Tags         guardians
// @Accept       json
// @Produce      json
// @Param        id path string true "Student ID"
// @Param        request body models.LinkGuardianRequest true "Link details"
// @Success      200 {object} map[string]string
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /students/{id}/guardians [post]
func (h *GuardianHandler) LinkToStudent(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student id"})
		return
	}

	var req models.LinkGuardianRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.LinkToStudent(c.Request.Context(), studentID, req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "guardian linked to student"})
}

// UnlinkFromStudent godoc
// @Summary      Unlink guardian from student
// @Description  Remove a guardian link from a student
// @Tags         guardians
// @Produce      json
// @Param        id path string true "Student ID"
// @Param        guardian_id path string true "Guardian ID"
// @Success      200 {object} map[string]string
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /students/{id}/guardians/{guardian_id} [delete]
func (h *GuardianHandler) UnlinkFromStudent(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student id"})
		return
	}

	guardianID, err := uuid.Parse(c.Param("guardian_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid guardian id"})
		return
	}

	if err := h.service.UnlinkFromStudent(c.Request.Context(), studentID, guardianID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "guardian unlinked from student"})
}

// ListByStudent godoc
// @Summary      List guardians by student
// @Description  Get all guardians linked to a student
// @Tags         guardians
// @Produce      json
// @Param        id path string true "Student ID"
// @Success      200 {array} models.GuardianWithPrimaryResponse
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /students/{id}/guardians [get]
func (h *GuardianHandler) ListByStudent(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student id"})
		return
	}

	guardians, err := h.service.ListByStudent(c.Request.Context(), studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, guardians)
}

// SetPrimaryContact godoc
// @Summary      Set primary contact
// @Description  Set a guardian as the primary contact for a student
// @Tags         guardians
// @Produce      json
// @Param        id path string true "Student ID"
// @Param        guardian_id path string true "Guardian ID"
// @Success      200 {object} map[string]string
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /students/{id}/guardians/{guardian_id}/set-primary [put]
func (h *GuardianHandler) SetPrimaryContact(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student id"})
		return
	}

	guardianID, err := uuid.Parse(c.Param("guardian_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid guardian id"})
		return
	}

	if err := h.service.SetPrimaryContact(c.Request.Context(), studentID, guardianID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "primary contact updated"})
}
