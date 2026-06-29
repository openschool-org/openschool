package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/services"
)

type ClassHandler struct {
	service *services.ClassService
}

func NewClassHandler(service *services.ClassService) *ClassHandler {
	return &ClassHandler{service: service}
}

// Create godoc
// @Summary      Create class
// @Description  Create a new class for a grade and academic year
// @Tags         classes
// @Accept       json
// @Produce      json
// @Param        request body models.CreateClassRequest true "Class details"
// @Success      201 {object} models.ClassResponse
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /classes [post]
func (h *ClassHandler) Create(c *gin.Context) {
	var req models.CreateClassRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	class, err := h.service.CreateClass(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, class)
}

// GetByID godoc
// @Summary      Get class by ID
// @Description  Get a single class by its ID
// @Tags         classes
// @Produce      json
// @Param        id path string true "Class ID"
// @Success      200 {object} models.ClassResponse
// @Failure      400 {object} map[string]string
// @Failure      404 {object} map[string]string
// @Security     BearerAuth
// @Router       /classes/{id} [get]
func (h *ClassHandler) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	class, err := h.service.GetClass(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "class not found"})
		return
	}

	c.JSON(http.StatusOK, class)
}

// ListByAcademicYear godoc
// @Summary      List classes by academic year
// @Description  Get all classes for a specific academic year
// @Tags         classes
// @Produce      json
// @Param        academic_year_id path string true "Academic Year ID"
// @Success      200 {array} models.ClassWithDetailsResponse
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /academic-years/{academic_year_id}/classes [get]
func (h *ClassHandler) ListByAcademicYear(c *gin.Context) {
	id, err := uuid.Parse(c.Param("academic_year_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid academic year id"})
		return
	}

	classes, err := h.service.ListByAcademicYear(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, classes)
}

// ListCurrent godoc
// @Summary      List current classes
// @Description  Get all classes for the current academic year
// @Tags         classes
// @Produce      json
// @Success      200 {array} models.ClassWithDetailsResponse
// @Failure      500 {object} map[string]string
// @Security     BearerAuth
// @Router       /classes/current [get]
func (h *ClassHandler) ListCurrent(c *gin.Context) {
	classes, err := h.service.ListCurrentClasses(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, classes)
}

// Update godoc
// @Summary      Update class
// @Description  Update class name or form teacher
// @Tags         classes
// @Accept       json
// @Produce      json
// @Param        id path string true "Class ID"
// @Param        request body models.UpdateClassRequest true "Class details"
// @Success      200 {object} models.ClassResponse
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /classes/{id} [put]
func (h *ClassHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req models.UpdateClassRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	class, err := h.service.UpdateClass(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, class)
}

// Delete godoc
// @Summary      Delete class
// @Description  Delete a class if no students are enrolled
// @Tags         classes
// @Produce      json
// @Param        id path string true "Class ID"
// @Success      200 {object} map[string]string
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /classes/{id} [delete]
func (h *ClassHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	if err := h.service.DeleteClass(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "class deleted"})
}

// AssignFormTeacher godoc
// @Summary      Assign form teacher
// @Description  Assign a form teacher to a class
// @Tags         classes
// @Accept       json
// @Produce      json
// @Param        id path string true "Class ID"
// @Param        request body models.AssignFormTeacherRequest true "Teacher details"
// @Success      200 {object} models.ClassResponse
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /classes/{id}/form-teacher [put]
func (h *ClassHandler) AssignFormTeacher(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req models.AssignFormTeacherRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	class, err := h.service.AssignFormTeacher(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, class)
}

// AssignSubjectTeacher godoc
// @Summary      Assign subject teacher
// @Description  Assign a teacher to teach a subject in a class
// @Tags         classes
// @Accept       json
// @Produce      json
// @Param        id path string true "Class ID"
// @Param        request body models.AssignSubjectTeacherRequest true "Subject teacher details"
// @Success      200 {object} map[string]string
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /classes/{id}/subject-teachers [post]
func (h *ClassHandler) AssignSubjectTeacher(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req models.AssignSubjectTeacherRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.AssignSubjectTeacher(c.Request.Context(), id, req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "subject teacher assigned"})
}

// ListSubjectTeachers godoc
// @Summary      List subject teachers
// @Description  Get all subject teachers assigned to a class
// @Tags         classes
// @Produce      json
// @Param        id path string true "Class ID"
// @Success      200 {array} models.SubjectTeacherResponse
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /classes/{id}/subject-teachers [get]
func (h *ClassHandler) ListSubjectTeachers(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	teachers, err := h.service.ListSubjectTeachers(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, teachers)
}

// EnrollStudent godoc
// @Summary      Enroll student in class
// @Description  Enroll a student into a class
// @Tags         classes
// @Produce      json
// @Param        id path string true "Class ID"
// @Param        student_id path string true "Student ID"
// @Success      200 {object} map[string]string
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /classes/{id}/students/{student_id}/enroll [post]
func (h *ClassHandler) EnrollStudent(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class id"})
		return
	}

	studentID, err := uuid.Parse(c.Param("student_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student id"})
		return
	}

	if err := h.service.EnrollStudent(c.Request.Context(), classID, studentID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "student enrolled"})
}

// UnenrollStudent godoc
// @Summary      Unenroll student from class
// @Description  Remove a student from a class
// @Tags         classes
// @Produce      json
// @Param        id path string true "Class ID"
// @Param        student_id path string true "Student ID"
// @Success      200 {object} map[string]string
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /classes/{id}/students/{student_id}/unenroll [delete]
func (h *ClassHandler) UnenrollStudent(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class id"})
		return
	}

	studentID, err := uuid.Parse(c.Param("student_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student id"})
		return
	}

	if err := h.service.UnenrollStudent(c.Request.Context(), classID, studentID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "student unenrolled"})
}
