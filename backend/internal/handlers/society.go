package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/services"
)

type SocietyHandler struct {
	service *services.SocietyService
}

func NewSocietyHandler(service *services.SocietyService) *SocietyHandler {
	return &SocietyHandler{service: service}
}

func societyServiceError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, services.ErrSocietyNotFound), errors.Is(err, services.ErrSocietyMemberNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
	case errors.Is(err, services.ErrNotTeacherInCharge):
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	}
}

// Create godoc
// @Summary      Create a society
// @Tags         societies
// @Accept       json
// @Produce      json
// @Param        request body models.CreateSocietyRequest true "Society"
// @Success      201 {object} map[string]string
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /societies [post]
func (h *SocietyHandler) Create(c *gin.Context) {
	var req models.CreateSocietyRequest
	if err := bindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	society, err := h.service.Create(c.Request.Context(), req)
	if err != nil {
		societyServiceError(c, err)
		return
	}

	c.JSON(http.StatusCreated, society)
}

// Update godoc
// @Summary      Rename a society or reassign its Teacher-in-Charge
// @Tags         societies
// @Accept       json
// @Produce      json
// @Param        id path string true "Society UUID"
// @Param        request body models.UpdateSocietyRequest true "Society"
// @Success      200 {object} map[string]string
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /societies/{id} [put]
func (h *SocietyHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid society id"})
		return
	}

	var req models.UpdateSocietyRequest
	if err := bindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	society, err := h.service.Update(c.Request.Context(), id, req)
	if err != nil {
		societyServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, society)
}

// Delete godoc
// @Summary      Delete a society
// @Tags         societies
// @Produce      json
// @Param        id path string true "Society UUID"
// @Success      200 {object} map[string]string
// @Failure      404 {object} map[string]string
// @Security     BearerAuth
// @Router       /societies/{id} [delete]
func (h *SocietyHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid society id"})
		return
	}

	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		societyServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "society deleted"})
}

// List godoc
// @Summary      List societies for an academic year
// @Tags         societies
// @Produce      json
// @Param        academic_year_id query string true "Academic year UUID"
// @Success      200 {array} map[string]string
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /societies [get]
func (h *SocietyHandler) List(c *gin.Context) {
	yearID, err := uuid.Parse(c.Query("academic_year_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "a valid academic_year_id is required"})
		return
	}

	list, err := h.service.ListByYear(c.Request.Context(), yearID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, list)
}

// ListYears godoc
// @Summary      List academic years that have at least one society
// @Tags         societies
// @Produce      json
// @Success      200 {array} map[string]interface{}
// @Security     BearerAuth
// @Router       /societies/years [get]
func (h *SocietyHandler) ListYears(c *gin.Context) {
	years, err := h.service.ListYears(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, years)
}

// ListMembers godoc
// @Summary      List a society's roster
// @Tags         societies
// @Produce      json
// @Param        id path string true "Society UUID"
// @Success      200 {array} map[string]interface{}
// @Security     BearerAuth
// @Router       /societies/{id}/members [get]
func (h *SocietyHandler) ListMembers(c *gin.Context) {
	societyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid society id"})
		return
	}

	members, err := h.service.ListMembers(c.Request.Context(), societyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, members)
}

// AssignMember godoc
// @Summary      Appoint (or re-appoint) a student to a society's roster
// @Description  Only the society's Teacher-in-Charge, or an admin, may call this
// @Tags         societies
// @Accept       json
// @Produce      json
// @Param        id path string true "Society UUID"
// @Param        request body models.AssignSocietyMemberRequest true "Membership"
// @Success      200 {object} map[string]string
// @Failure      403 {object} map[string]string
// @Security     BearerAuth
// @Router       /societies/{id}/members [put]
func (h *SocietyHandler) AssignMember(c *gin.Context) {
	societyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid society id"})
		return
	}

	var req models.AssignSocietyMemberRequest
	if err := bindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	actor, err := actorFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	member, err := h.service.AssignMember(c.Request.Context(), actor, societyID, req)
	if err != nil {
		societyServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, member)
}

// RemoveMember godoc
// @Summary      Remove a student from a society's roster
// @Description  Only the society's Teacher-in-Charge, or an admin, may call this
// @Tags         societies
// @Produce      json
// @Param        id path string true "Society UUID"
// @Param        memberId path string true "Society member UUID"
// @Success      200 {object} map[string]string
// @Failure      403 {object} map[string]string
// @Failure      404 {object} map[string]string
// @Security     BearerAuth
// @Router       /societies/{id}/members/{memberId} [delete]
func (h *SocietyHandler) RemoveMember(c *gin.Context) {
	societyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid society id"})
		return
	}

	memberID, err := uuid.Parse(c.Param("memberId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid member id"})
		return
	}

	actor, err := actorFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.RemoveMember(c.Request.Context(), actor, societyID, memberID); err != nil {
		societyServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "society member removed"})
}

// ListByStudent godoc
// @Summary      List a student's society memberships across all years
// @Tags         societies
// @Produce      json
// @Param        id path string true "Student ID"
// @Success      200 {array} map[string]interface{}
// @Security     BearerAuth
// @Router       /students/{id}/society-memberships [get]
func (h *SocietyHandler) ListByStudent(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student id"})
		return
	}

	list, err := h.service.ListMembershipsByStudent(c.Request.Context(), studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, list)
}
