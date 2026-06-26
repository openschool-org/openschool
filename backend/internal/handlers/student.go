package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/services"
)

type StudentHandler struct {
	service *services.StudentService
}

func NewStudentHandler(service *services.StudentService) *StudentHandler {
	return &StudentHandler{service: service}
}

func (h *StudentHandler) Create(c *gin.Context) {
	var req models.CreateStudentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	student, err := h.service.CreateStudent(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, student)
}

// GetByID godoc
// @Summary      Get student by ID
// @Description  Get a student profile by ID
// @Tags         students
// @Produce      json
// @Param        id path string true "Student ID"
// @Success      200 {object} models.StudentResponse
// @Failure      400 {object} map[string]string
// @Failure      404 {object} map[string]string
// @Security     BearerAuth
// @Router       /students/{id} [get]
func (h *StudentHandler) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	student, err := h.service.GetStudent(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "student not found"})
		return
	}

	c.JSON(http.StatusOK, student)
}

// GetWithClass godoc
// @Summary      Get student with class
// @Description  Get a student profile with their current class details
// @Tags         students
// @Produce      json
// @Param        id path string true "Student ID"
// @Success      200 {object} models.StudentWithClassResponse
// @Failure      400 {object} map[string]string
// @Failure      404 {object} map[string]string
// @Security     BearerAuth
// @Router       /students/{id}/class [get]
func (h *StudentHandler) GetWithClass(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	student, err := h.service.GetStudentWithClass(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "student not found"})
		return
	}

	c.JSON(http.StatusOK, student)
}

// List godoc
// @Summary      List students
// @Description  Get all students
// @Tags         students
// @Produce      json
// @Success      200 {array} models.StudentResponse
// @Failure      500 {object} map[string]string
// @Security     BearerAuth
// @Router       /students [get]
func (h *StudentHandler) List(c *gin.Context) {
	students, err := h.service.ListStudents(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, students)
}

// ListByClass godoc
// @Summary      List students by class
// @Description  Get all students enrolled in a specific class
// @Tags         students
// @Produce      json
// @Param        id path string true "Class ID"
// @Success      200 {array} models.StudentResponse
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /classes/{id}/students [get]
func (h *StudentHandler) ListByClass(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	students, err := h.service.ListStudentsByClass(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, students)
}

// Update godoc
// @Summary      Update student
// @Description  Update a student profile
// @Tags         students
// @Accept       json
// @Produce      json
// @Param        id path string true "Student ID"
// @Param        request body models.UpdateStudentRequest true "Student details"
// @Success      200 {object} models.StudentResponse
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /students/{id} [put]
func (h *StudentHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req models.UpdateStudentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	student, err := h.service.UpdateStudent(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, student)
}

// Delete godoc
// @Summary      Delete student
// @Description  Delete a student profile and ThunderID user account
// @Tags         students
// @Produce      json
// @Param        id path string true "Student ID"
// @Success      200 {object} map[string]string
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /students/{id} [delete]
func (h *StudentHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	if err := h.service.DeleteStudent(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "student deleted"})
}
