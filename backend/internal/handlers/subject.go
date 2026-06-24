package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/services"
)

type SubjectHandler struct {
	service *services.SubjectService
}

func NewSubjectHandler(service *services.SubjectService) *SubjectHandler {
	return &SubjectHandler{service: service}
}

// Create godoc
// @Summary      Create subject
// @Description  Create a new subject with a unique name and code
// @Tags         subjects
// @Accept       json
// @Produce      json
// @Param        request  body      models.CreateSubjectRequest  true  "Subject info"
// @Success      201      {object}  models.SubjectResponse
// @Failure      400      {object}  map[string]string
// @Security     BearerAuth
// @Router       /subjects [post]
func (h *SubjectHandler) Create(c *gin.Context) {
	var req models.CreateSubjectRequest
	if err := bindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	subject, err := h.service.CreateSubject(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, subject)
}

// GetByID godoc
// @Summary      Get subject
// @Description  Retrieve a subject by ID
// @Tags         subjects
// @Produce      json
// @Param        id   path      string  true  "Subject UUID"
// @Success      200  {object}  models.SubjectResponse
// @Failure      400  {object}  map[string]string
// @Failure      404  {object}  map[string]string
// @Security     BearerAuth
// @Router       /subjects/{id} [get]
func (h *SubjectHandler) GetByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	subject, err := h.service.GetSubject(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "subject not found"})
		return
	}

	c.JSON(http.StatusOK, subject)
}

// List godoc
// @Summary      List subjects
// @Description  Retrieve all subjects ordered by name
// @Tags         subjects
// @Produce      json
// @Success      200  {array}   models.SubjectResponse
// @Failure      500  {object}  map[string]string
// @Security     BearerAuth
// @Router       /subjects [get]
func (h *SubjectHandler) List(c *gin.Context) {
	subjects, err := h.service.ListSubjects(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, subjects)
}

// Update godoc
// @Summary      Update subject
// @Description  Update a subject's name and code by ID
// @Tags         subjects
// @Accept       json
// @Produce      json
// @Param        id       path      string                       true  "Subject UUID"
// @Param        request  body      models.UpdateSubjectRequest  true  "Subject info"
// @Success      200      {object}  models.SubjectResponse
// @Failure      400      {object}  map[string]string
// @Security     BearerAuth
// @Router       /subjects/{id} [put]
func (h *SubjectHandler) Update(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req models.UpdateSubjectRequest
	if err := bindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	subject, err := h.service.UpdateSubject(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, subject)
}

// Delete godoc
// @Summary      Delete subject
// @Description  Delete a subject by ID; blocked if the subject is assigned to a grade, class, or student selection
// @Tags         subjects
// @Produce      json
// @Param        id   path      string  true  "Subject UUID"
// @Success      200  {object}  map[string]string
// @Failure      400  {object}  map[string]string
// @Failure      404  {object}  map[string]string
// @Failure      409  {object}  map[string]string
// @Security     BearerAuth
// @Router       /subjects/{id} [delete]
func (h *SubjectHandler) Delete(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	if err := h.service.DeleteSubject(c.Request.Context(), id); err != nil {
		if errors.Is(err, services.ErrSubjectNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "subject deleted"})
}
