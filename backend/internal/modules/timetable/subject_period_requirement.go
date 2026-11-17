package timetable

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/openschool-org/openschool/internal/platform/httpx"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/apierror"
)

var (
	errLabPeriodsExceedTotal         = errors.New("lab periods per week cannot exceed periods per week")
	errDoublePeriodBlocksExceedTotal = errors.New("double period blocks cannot need more periods than periods per week")
)

type SubjectPeriodRequirement struct {
	ID                 uuid.UUID `json:"id"`
	AcademicYearID     uuid.UUID `json:"academic_year_id"`
	GradeID            uuid.UUID `json:"grade_id"`
	SubjectID          uuid.UUID `json:"subject_id"`
	PeriodsPerWeek     int32     `json:"periods_per_week"`
	CreatedAt          time.Time `json:"created_at"`
	LabPeriodsPerWeek  int32     `json:"lab_periods_per_week"`
	DoublePeriodBlocks int32     `json:"double_period_blocks"`
}

type SubjectPeriodRequirementListItem struct {
	SubjectPeriodRequirement
	SubjectName string `json:"subject_name"`
	SubjectCode string `json:"subject_code"`
}

type subjectPeriodRequirementCommand struct {
	AcademicYearID     uuid.UUID `json:"academic_year_id" binding:"required"`
	GradeID            uuid.UUID `json:"grade_id" binding:"required"`
	SubjectID          uuid.UUID `json:"subject_id" binding:"required"`
	PeriodsPerWeek     int32     `json:"periods_per_week" binding:"required"`
	LabPeriodsPerWeek  int32     `json:"lab_periods_per_week"`
	DoublePeriodBlocks int32     `json:"double_period_blocks"`
}

type subjectPeriodRequirementStore interface {
	upsert(context.Context, subjectPeriodRequirementCommand) (SubjectPeriodRequirement, error)
	listByGrade(context.Context, uuid.UUID, uuid.UUID) ([]SubjectPeriodRequirementListItem, error)
	deleteRequirement(context.Context, uuid.UUID) error
}

type subjectPeriodRequirementService struct{ requirements subjectPeriodRequirementStore }

func (s *subjectPeriodRequirementService) upsert(ctx context.Context, command subjectPeriodRequirementCommand) (SubjectPeriodRequirement, error) {
	if command.LabPeriodsPerWeek > command.PeriodsPerWeek {
		return SubjectPeriodRequirement{}, errLabPeriodsExceedTotal
	}
	if command.DoublePeriodBlocks*2 > command.PeriodsPerWeek {
		return SubjectPeriodRequirement{}, errDoublePeriodBlocksExceedTotal
	}
	return s.requirements.upsert(ctx, command)
}

type subjectPeriodRequirementHandler struct {
	service *subjectPeriodRequirementService
}

func newSubjectPeriodRequirementHandler(store subjectPeriodRequirementStore) *subjectPeriodRequirementHandler {
	return &subjectPeriodRequirementHandler{service: &subjectPeriodRequirementService{requirements: store}}
}
func (h *subjectPeriodRequirementHandler) upsert(c *gin.Context) {
	var command subjectPeriodRequirementCommand
	if err := c.ShouldBindJSON(&command); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	requirement, err := h.service.upsert(c.Request.Context(), command)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, requirement)
}
func (h *subjectPeriodRequirementHandler) listByGrade(c *gin.Context) {
	yearID, ok := httpx.QueryUUID(c, "academic_year_id", "a valid academic_year_id is required")
	if !ok {
		return
	}
	gradeID, ok := httpx.QueryUUID(c, "grade_id", "a valid grade_id is required")
	if !ok {
		return
	}
	requirements, err := h.service.requirements.listByGrade(c.Request.Context(), yearID, gradeID)
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, requirements)
}
func (h *subjectPeriodRequirementHandler) delete(c *gin.Context) {
	id, ok := httpx.ParamUUID(c, "id", "invalid id")
	if !ok {
		return
	}
	if err := h.service.requirements.deleteRequirement(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "subject period requirement removed"})
}
