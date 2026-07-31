package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/services"
)

type TermHandler struct {
	service *services.TermService
}

func NewTermHandler(service *services.TermService) *TermHandler {
	return &TermHandler{service: service}
}

// Create godoc
// @Summary      Create term
// @Description  Create a new term within an academic year
// @Tags         terms
// @Accept       json
// @Produce      json
// @Param        request  body      models.CreateTermRequest  true  "Term info"
// @Success      201      {object}  models.TermResponse
// @Failure      400      {object}  map[string]string
// @Security     BearerAuth
// @Router       /terms [post]
func (h *TermHandler) Create(c *gin.Context) {
	var req models.CreateTermRequest
	if err := bindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	term, err := h.service.CreateTerm(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, term)
}

// ListByAcademicYear godoc
// @Summary      List terms
// @Description  Retrieve all terms for an academic year, ordered by sort_order
// @Tags         terms
// @Produce      json
// @Param        academic_year_id  query     string  true  "Academic year UUID"
// @Success      200  {array}   models.TermResponse
// @Failure      400  {object}  map[string]string
// @Security     BearerAuth
// @Router       /terms [get]
func (h *TermHandler) ListByAcademicYear(c *gin.Context) {
	yearIDStr := c.Query("academic_year_id")
	yearID, err := uuid.Parse(yearIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid or missing academic_year_id"})
		return
	}

	terms, err := h.service.ListTermsByAcademicYear(c.Request.Context(), yearID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, terms)
}

// GetCurrent godoc
// @Summary      Get current term
// @Description  Retrieve the term marked as current
// @Tags         terms
// @Produce      json
// @Success      200  {object}  models.TermResponse
// @Failure      404  {object}  map[string]string
// @Security     BearerAuth
// @Router       /terms/current [get]
func (h *TermHandler) GetCurrent(c *gin.Context) {
	term, err := h.service.GetCurrentTerm(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no current term"})
		return
	}

	c.JSON(http.StatusOK, term)
}

// SetCurrent godoc
// @Summary      Set current term
// @Description  Mark a term as the current one; clears the previous current
// @Tags         terms
// @Produce      json
// @Param        id   path      string  true  "Term UUID"
// @Success      200  {object}  map[string]string
// @Failure      400  {object}  map[string]string
// @Failure      404  {object}  map[string]string
// @Security     BearerAuth
// @Router       /terms/{id}/set-current [put]
func (h *TermHandler) SetCurrent(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	if err := h.service.SetCurrentTerm(c.Request.Context(), id); err != nil {
		if errors.Is(err, services.ErrTermNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "current term updated"})
}

// Update godoc
// @Summary      Update term
// @Description  Update a term's name, dates, or sort order by ID
// @Tags         terms
// @Accept       json
// @Produce      json
// @Param        id       path      string                    true  "Term UUID"
// @Param        request  body      models.UpdateTermRequest  true  "Term info"
// @Success      200      {object}  models.TermResponse
// @Failure      400      {object}  map[string]string
// @Security     BearerAuth
// @Router       /terms/{id} [put]
func (h *TermHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req models.UpdateTermRequest
	if err := bindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	term, err := h.service.UpdateTerm(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, term)
}

// Delete godoc
// @Summary      Delete term
// @Description  Delete a term by ID; blocked if marks have been recorded against it
// @Tags         terms
// @Produce      json
// @Param        id   path      string  true  "Term UUID"
// @Success      200  {object}  map[string]string
// @Failure      400  {object}  map[string]string
// @Failure      404  {object}  map[string]string
// @Failure      409  {object}  map[string]string
// @Security     BearerAuth
// @Router       /terms/{id} [delete]
func (h *TermHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	if err := h.service.DeleteTerm(c.Request.Context(), id); err != nil {
		if errors.Is(err, services.ErrTermNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "term deleted"})
}
