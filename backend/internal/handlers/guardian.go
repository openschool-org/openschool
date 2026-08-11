package handlers

import (
	"errors"
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

	guardian, duplicates, err := h.service.CreateGuardian(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"guardian": guardian, "possible_duplicates": duplicates})
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

// List godoc
// @Summary      List all guardians
// @Description  Every guardian on file, optionally filtered by name/phone/email — used by the directory and the "link existing guardian" search picker
// @Tags         guardians
// @Produce      json
// @Param        search query string false "Filter by name/phone/email"
// @Param        orphans query bool false "Only guardians linked to no student"
// @Success      200 {array} models.GuardianResponse
// @Security     BearerAuth
// @Router       /guardians [get]
func (h *GuardianHandler) List(c *gin.Context) {
	orphansOnly := c.Query("orphans") == "true"
	guardians, err := h.service.ListGuardians(c.Request.Context(), c.Query("search"), orphansOnly)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, guardians)
}

// ListStudents godoc
// @Summary      List a guardian's linked students
// @Description  Every student linked to this guardian, regardless of portal-login status — for the guardian directory
// @Tags         guardians
// @Produce      json
// @Param        id path string true "Guardian ID"
// @Success      200 {array} models.StudentResponse
// @Security     BearerAuth
// @Router       /guardians/{id}/students [get]
func (h *GuardianHandler) ListStudents(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	students, err := h.service.ListStudentsFor(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, students)
}

// ListNotifications godoc
// @Summary      List a guardian's notification history
// @Description  Notifications sent to this guardian's portal account (empty if they don't have one)
// @Tags         guardians
// @Produce      json
// @Param        id path string true "Guardian ID"
// @Success      200 {array} notificationsmodels.MyNotificationResponse
// @Security     BearerAuth
// @Router       /guardians/{id}/notifications [get]
func (h *GuardianHandler) ListNotifications(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	notifications, err := h.service.ListNotifications(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, notifications)
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

// Delete godoc
// @Summary      Delete guardian
// @Description  Delete a guardian record outright — blocked while linked to any student
// @Tags         guardians
// @Produce      json
// @Param        id path string true "Guardian ID"
// @Success      200 {object} map[string]string
// @Failure      404 {object} map[string]string
// @Failure      409 {object} map[string]string
// @Security     BearerAuth
// @Router       /guardians/{id} [delete]
func (h *GuardianHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	actor, err := actorFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.DeleteGuardian(c.Request.Context(), id, actor.ID); err != nil {
		switch {
		case errors.Is(err, services.ErrGuardianNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		case errors.Is(err, services.ErrGuardianInUse):
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "guardian deleted"})
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

// ProvisionLogin godoc
// @Summary      Provision a parent portal login for a guardian
// @Description  Creates an identity-provider account for an existing guardian and links it, giving them parent-portal access
// @Tags         guardians
// @Accept       json
// @Produce      json
// @Param        id       path      string                                 true  "Guardian ID"
// @Param        request  body      models.ProvisionGuardianLoginRequest  true  "Login details"
// @Success      200      {object}  models.GuardianResponse
// @Failure      400      {object}  map[string]string
// @Failure      404      {object}  map[string]string
// @Failure      409      {object}  map[string]string
// @Security     BearerAuth
// @Router       /guardians/{id}/provision-login [post]
func (h *GuardianHandler) ProvisionLogin(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req models.ProvisionGuardianLoginRequest
	if err := bindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	actor, err := actorFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	guardian, err := h.service.ProvisionLogin(c.Request.Context(), id, req, actor.ID)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrGuardianNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		case errors.Is(err, services.ErrGuardianAlreadyProvisioned), errors.Is(err, services.ErrGuardianMissingEmail), errors.Is(err, services.ErrGuardianMissingNIC):
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, guardian)
}
