package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/services"
)

type TeacherHandler struct {
	service *services.TeacherService
}

func NewTeacherHandler(service *services.TeacherService) *TeacherHandler {
	return &TeacherHandler{service: service}
}

// Create godoc
// @Summary      Create teacher
// @Description  Onboard a new teacher - creates ThunderID user and teacher profile
// @Tags         teachers
// @Accept       json
// @Produce      json
// @Param        request body models.CreateTeacherRequest true "Teacher details"
// @Success      201 {object} models.TeacherResponse
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /teachers [post]
func (h *TeacherHandler) Create(c *gin.Context) {
	var req models.CreateTeacherRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	teacher, err := h.service.CreateTeacher(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, teacher)
}

// GetByID godoc
// @Summary      Get teacher by ID
// @Description  Get a teacher profile by ID
// @Tags         teachers
// @Produce      json
// @Param        id path string true "Teacher ID"
// @Success      200 {object} models.TeacherResponse
// @Failure      400 {object} map[string]string
// @Failure      404 {object} map[string]string
// @Security     BearerAuth
// @Router       /teachers/{id} [get]
func (h *TeacherHandler) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	teacher, err := h.service.GetTeacher(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "teacher not found"})
		return
	}

	c.JSON(http.StatusOK, teacher)
}

// List godoc
// @Summary      List teachers
// @Description  Get all teachers
// @Tags         teachers
// @Produce      json
// @Success      200 {array} models.TeacherResponse
// @Failure      500 {object} map[string]string
// @Security     BearerAuth
// @Router       /teachers [get]
func (h *TeacherHandler) List(c *gin.Context) {
	teachers, err := h.service.ListTeachers(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, teachers)
}

// Update godoc
// @Summary      Update teacher
// @Description  Update a teacher profile
// @Tags         teachers
// @Accept       json
// @Produce      json
// @Param        id path string true "Teacher ID"
// @Param        request body models.UpdateTeacherRequest true "Teacher details"
// @Success      200 {object} models.TeacherResponse
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /teachers/{id} [put]
func (h *TeacherHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req models.UpdateTeacherRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	teacher, err := h.service.UpdateTeacher(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, teacher)
}

// Delete godoc
// @Summary      Delete teacher
// @Description  Delete a teacher profile and ThunderID user account
// @Tags         teachers
// @Produce      json
// @Param        id path string true "Teacher ID"
// @Success      200 {object} map[string]string
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /teachers/{id} [delete]
func (h *TeacherHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	if err := h.service.DeleteTeacher(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "teacher deleted"})
}

// AssignSubject godoc
// @Summary      Assign subject to teacher
// @Description  Assign a subject qualification to a teacher
// @Tags         teachers
// @Accept       json
// @Produce      json
// @Param        id path string true "Teacher ID"
// @Param        request body models.AssignSubjectToTeacherRequest true "Subject details"
// @Success      200 {object} map[string]string
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /teachers/{id}/subjects [post]
func (h *TeacherHandler) AssignSubject(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req models.AssignSubjectToTeacherRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.AssignSubject(c.Request.Context(), id, req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "subject assigned to teacher"})
}

// RemoveSubject godoc
// @Summary      Remove subject from teacher
// @Description  Remove a subject qualification from a teacher
// @Tags         teachers
// @Produce      json
// @Param        id path string true "Teacher ID"
// @Param        subject_id path string true "Subject ID"
// @Success      200 {object} map[string]string
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /teachers/{id}/subjects/{subject_id} [delete]
func (h *TeacherHandler) RemoveSubject(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	subjectID, err := uuid.Parse(c.Param("subject_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid subject id"})
		return
	}

	if err := h.service.RemoveSubject(c.Request.Context(), id, subjectID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "subject removed from teacher"})
}

// ListSubjects godoc
// @Summary      List teacher subjects
// @Description  Get all subjects assigned to a teacher
// @Tags         teachers
// @Produce      json
// @Param        id path string true "Teacher ID"
// @Success      200 {array} models.TeacherSubjectResponse
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /teachers/{id}/subjects [get]
func (h *TeacherHandler) ListSubjects(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	subjects, err := h.service.ListSubjects(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, subjects)
}
