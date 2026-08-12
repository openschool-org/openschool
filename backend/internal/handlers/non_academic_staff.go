package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/middleware"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/services"
)

type NonAcademicStaffHandler struct {
	service *services.NonAcademicStaffService
}

func NewNonAcademicStaffHandler(service *services.NonAcademicStaffService) *NonAcademicStaffHandler {
	return &NonAcademicStaffHandler{service: service}
}

// Create godoc
// @Summary      Create non-academic staff
// @Description  Create a new non-academic staff record (Lab Assistant, Librarian, Office Staff, etc.) — no login/IDP account
// @Tags         non-academic-staff
// @Accept       json
// @Produce      json
// @Param        request body models.CreateNonAcademicStaffRequest true "Staff details"
// @Success      201 {object} models.NonAcademicStaffResponse
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /non-academic-staff [post]
func (h *NonAcademicStaffHandler) Create(c *gin.Context) {
	var req models.CreateNonAcademicStaffRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	staff, err := h.service.Create(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, staff)
}

// GetByID godoc
// @Summary      Get non-academic staff by ID
// @Tags         non-academic-staff
// @Produce      json
// @Param        id path string true "Staff ID"
// @Success      200 {object} models.NonAcademicStaffResponse
// @Failure      404 {object} map[string]string
// @Security     BearerAuth
// @Router       /non-academic-staff/{id} [get]
func (h *NonAcademicStaffHandler) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	staff, err := h.service.Get(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, staff)
}

// List godoc
// @Summary      List non-academic staff
// @Tags         non-academic-staff
// @Produce      json
// @Param        search query string false "Filter by name/employee number"
// @Param        designation query string false "Filter by designation"
// @Success      200 {array} models.NonAcademicStaffResponse
// @Security     BearerAuth
// @Router       /non-academic-staff [get]
func (h *NonAcademicStaffHandler) List(c *gin.Context) {
	staff, err := h.service.List(c.Request.Context(), c.Query("search"), c.Query("designation"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, staff)
}

// Update godoc
// @Summary      Update non-academic staff
// @Tags         non-academic-staff
// @Accept       json
// @Produce      json
// @Param        id path string true "Staff ID"
// @Param        request body models.UpdateNonAcademicStaffRequest true "Staff details"
// @Success      200 {object} models.NonAcademicStaffResponse
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /non-academic-staff/{id} [put]
func (h *NonAcademicStaffHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req models.UpdateNonAcademicStaffRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	staff, err := h.service.Update(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, staff)
}

// UpdateEmploymentStatus godoc
// @Summary      Update non-academic staff employment status
// @Tags         non-academic-staff
// @Accept       json
// @Produce      json
// @Param        id path string true "Staff ID"
// @Param        request body models.UpdateNonAcademicStaffEmploymentStatusRequest true "Status"
// @Success      200 {object} models.NonAcademicStaffResponse
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /non-academic-staff/{id}/employment-status [put]
func (h *NonAcademicStaffHandler) UpdateEmploymentStatus(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req models.UpdateNonAcademicStaffEmploymentStatusRequest
	if err := bindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	staff, err := h.service.SetEmploymentStatus(c.Request.Context(), id, req.Status)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, staff)
}

// UpdateHouse godoc
// @Summary      Update non-academic staff house (admin override, audited)
// @Tags         non-academic-staff
// @Accept       json
// @Produce      json
// @Param        id path string true "Staff ID"
// @Param        request body models.UpdateNonAcademicStaffHouseRequest true "House"
// @Success      200 {object} models.NonAcademicStaffResponse
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /non-academic-staff/{id}/house [put]
func (h *NonAcademicStaffHandler) UpdateHouse(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req models.UpdateNonAcademicStaffHouseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	actorID, err := middleware.UserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return
	}

	staff, err := h.service.UpdateHouse(c.Request.Context(), id, req.HouseID, actorID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, staff)
}

// Delete godoc
// @Summary      Delete non-academic staff
// @Description  Hard delete — nothing references non_academic_staff rows yet
// @Tags         non-academic-staff
// @Produce      json
// @Param        id path string true "Staff ID"
// @Success      200 {object} map[string]string
// @Failure      404 {object} map[string]string
// @Security     BearerAuth
// @Router       /non-academic-staff/{id} [delete]
func (h *NonAcademicStaffHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		if errors.Is(err, services.ErrNonAcademicStaffNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "staff member deleted"})
}
