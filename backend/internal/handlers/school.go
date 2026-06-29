package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/services"
)

type SchoolHandler struct {
	service *services.SchoolService
}

func NewSchoolHandler(service *services.SchoolService) *SchoolHandler {
	return &SchoolHandler{service: service}
}

// Create godoc
// @Summary      Create school
// @Description  Create the school record for this instance
// @Tags         school
// @Accept       json
// @Produce      json
// @Param        request  body      models.CreateSchoolRequest  true  "School info"
// @Success      201      {object}  models.SchoolResponse
// @Failure      400      {object}  map[string]string
// @Security     BearerAuth
// @Router       /school [post]
func (h *SchoolHandler) Create(c *gin.Context) {
	var req models.CreateSchoolRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	school, err := h.service.CreateSchool(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, school)
}

// Get godoc
// @Summary      Get school
// @Description  Retrieve the school record for this instance
// @Tags         school
// @Produce      json
// @Success      200  {object}  models.SchoolResponse
// @Failure      404  {object}  map[string]string
// @Security     BearerAuth
// @Router       /school [get]
func (h *SchoolHandler) Get(c *gin.Context) {
	school, err := h.service.GetSchool(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "school not found"})
		return
	}

	c.JSON(http.StatusOK, school)
}

// Update godoc
// @Summary      Update school
// @Description  Update the school record by ID
// @Tags         school
// @Accept       json
// @Produce      json
// @Param        id       path      string                      true  "School UUID"
// @Param        request  body      models.UpdateSchoolRequest  true  "School info"
// @Success      200      {object}  models.SchoolResponse
// @Failure      400      {object}  map[string]string
// @Failure      500      {object}  map[string]string
// @Security     BearerAuth
// @Router       /school/{id} [put]
func (h *SchoolHandler) Update(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req models.UpdateSchoolRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	school, err := h.service.UpdateSchool(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, school)
}

// CreateAcademicYear godoc
// @Summary      Create academic year
// @Description  Create a new academic year
// @Tags         academic-years
// @Accept       json
// @Produce      json
// @Param        request  body      models.CreateAcademicYearRequest  true  "Academic year info"
// @Success      201      {object}  models.AcademicYearResponse
// @Failure      400      {object}  map[string]string
// @Security     BearerAuth
// @Router       /academic-years [post]
func (h *SchoolHandler) CreateAcademicYear(c *gin.Context) {
	var req models.CreateAcademicYearRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	year, err := h.service.CreateAcademicYear(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, year)
}

// ListAcademicYears godoc
// @Summary      List academic years
// @Description  Retrieve all academic years ordered by start date
// @Tags         academic-years
// @Produce      json
// @Success      200  {array}   models.AcademicYearResponse
// @Failure      500  {object}  map[string]string
// @Security     BearerAuth
// @Router       /academic-years [get]
func (h *SchoolHandler) ListAcademicYears(c *gin.Context) {
	years, err := h.service.ListAcademicYears(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, years)
}

// GetCurrentAcademicYear godoc
// @Summary      Get current academic year
// @Description  Retrieve the academic year marked as current
// @Tags         academic-years
// @Produce      json
// @Success      200  {object}  models.AcademicYearResponse
// @Failure      404  {object}  map[string]string
// @Security     BearerAuth
// @Router       /academic-years/current [get]
func (h *SchoolHandler) GetCurrentAcademicYear(c *gin.Context) {
	year, err := h.service.GetCurrentAcademicYear(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no current academic year"})
		return
	}

	c.JSON(http.StatusOK, year)
}

// SetCurrentAcademicYear godoc
// @Summary      Set current academic year
// @Description  Mark an academic year as the current one; clears the previous current
// @Tags         academic-years
// @Produce      json
// @Param        id   path      string  true  "Academic year UUID"
// @Success      200  {object}  map[string]string
// @Failure      400  {object}  map[string]string
// @Failure      500  {object}  map[string]string
// @Security     BearerAuth
// @Router       /academic-years/{id}/set-current [put]
func (h *SchoolHandler) SetCurrentAcademicYear(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	if err := h.service.SetCurrentAcademicYear(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "current academic year updated"})
}

// DeleteAcademicYear godoc
// @Summary      Delete academic year
// @Description  Delete an academic year by ID
// @Tags         academic-years
// @Produce      json
// @Param        id   path      string  true  "Academic year UUID"
// @Success      200  {object}  map[string]string
// @Failure      400  {object}  map[string]string
// @Security     BearerAuth
// @Router       /academic-years/{id} [delete]
func (h *SchoolHandler) DeleteAcademicYear(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	if err := h.service.DeleteAcademicYear(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "academic year deleted"})
}
