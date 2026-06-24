package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/services"
)

var _ db.Grade

type GradeHandler struct {
	service *services.GradeService
}

func NewGradeHandler(service *services.GradeService) *GradeHandler {
	return &GradeHandler{service: service}
}

// Create godoc
// @Summary      Create grade
// @Description  Create a new grade level
// @Tags         grades
// @Accept       json
// @Produce      json
// @Param        request  body      models.CreateGradeRequest  true  "Grade info"
// @Success      201      {object}  db.Grade
// @Failure      400      {object}  map[string]string
// @Security     BearerAuth
// @Router       /grades [post]
func (h *GradeHandler) Create(c *gin.Context) {
	var req models.CreateGradeRequest
	if err := bindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	grade, err := h.service.CreateGrade(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, grade)
}

// GetByID godoc
// @Summary      Get grade
// @Description  Retrieve a grade by ID
// @Tags         grades
// @Produce      json
// @Param        id   path      string  true  "Grade UUID"
// @Success      200  {object}  db.Grade
// @Failure      400  {object}  map[string]string
// @Failure      404  {object}  map[string]string
// @Security     BearerAuth
// @Router       /grades/{id} [get]
func (h *GradeHandler) GetByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	grade, err := h.service.GetGrade(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "grade not found"})
		return
	}

	c.JSON(http.StatusOK, grade)
}

// List godoc
// @Summary      List grades
// @Description  Retrieve all grades ordered by sort_order then name
// @Tags         grades
// @Produce      json
// @Success      200  {array}   db.Grade
// @Failure      500  {object}  map[string]string
// @Security     BearerAuth
// @Router       /grades [get]
func (h *GradeHandler) List(c *gin.Context) {
	grades, err := h.service.ListGrades(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, grades)
}

// Update godoc
// @Summary      Update grade
// @Description  Update a grade's name or sort order by ID
// @Tags         grades
// @Accept       json
// @Produce      json
// @Param        id       path      string                     true  "Grade UUID"
// @Param        request  body      models.UpdateGradeRequest  true  "Grade info"
// @Success      200      {object}  db.Grade
// @Failure      400      {object}  map[string]string
// @Security     BearerAuth
// @Router       /grades/{id} [put]
func (h *GradeHandler) Update(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req models.UpdateGradeRequest
	if err := bindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	grade, err := h.service.UpdateGrade(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, grade)
}

// Delete godoc
// @Summary      Delete grade
// @Description  Delete a grade by ID; blocked if the grade is assigned to any class
// @Tags         grades
// @Produce      json
// @Param        id   path      string  true  "Grade UUID"
// @Success      200  {object}  map[string]string
// @Failure      400  {object}  map[string]string
// @Failure      404  {object}  map[string]string
// @Failure      409  {object}  map[string]string
// @Security     BearerAuth
// @Router       /grades/{id} [delete]
func (h *GradeHandler) Delete(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	if err := h.service.DeleteGrade(c.Request.Context(), id); err != nil {
		if errors.Is(err, services.ErrGradeNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "grade deleted"})
}
