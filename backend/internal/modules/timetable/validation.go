package timetable

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/openschool-org/openschool/internal/apierror"
)

type ValidationIssue struct {
	Severity     string `json:"severity"`
	Message      string `json:"message"`
	DayOfWeek    *int16 `json:"day_of_week,omitempty"`
	PeriodNumber *int16 `json:"period_number,omitempty"`
}
type ValidationResult struct {
	Valid  bool              `json:"valid"`
	Issues []ValidationIssue `json:"issues"`
}
type validationContext struct {
	AcademicYearID uuid.UUID
	ClassID        uuid.UUID
	GradeID        uuid.UUID
	FormTeacherID  *uuid.UUID
}
type crossBooking struct {
	DayOfWeek, PeriodNumber int16
	TeacherID, ClassroomID  *uuid.UUID
	ClassName               string
	OptionBlockID           *uuid.UUID // set when the booking is a teacher's share of an option block period
}

// blockTeacher is a teacher a class's students go to during an option block period.
type blockTeacher struct {
	ID   uuid.UUID
	Name string
}
type requirementValue struct {
	SubjectID      uuid.UUID
	SubjectName    string
	PeriodsPerWeek int32
}

type timetableValidationStore interface {
	validationContext(context.Context, uuid.UUID) (validationContext, error)
	validationEntries(context.Context, uuid.UUID) ([]TimetableEntry, error)
	crossBookings(context.Context, uuid.UUID, uuid.UUID) ([]crossBooking, error)
	teacherUnavailable(context.Context, uuid.UUID, uuid.UUID, int16, int16) (bool, error)
	classSubjectTeacher(context.Context, uuid.UUID, uuid.UUID) (uuid.UUID, error)
	teacherAssignedSubject(context.Context, uuid.UUID, uuid.UUID) (bool, error)
	requirements(context.Context, uuid.UUID, uuid.UUID) ([]requirementValue, error)
	entrySubjectCounts(context.Context, uuid.UUID) (map[uuid.UUID]int32, error)
	authorizedReviewers(context.Context, uuid.UUID, uuid.UUID) ([]uuid.UUID, error)
	blockTeachers(context.Context, uuid.UUID, uuid.UUID) ([]blockTeacher, error)
}

type validationService struct{ store timetableValidationStore }

func (s *validationService) validate(ctx context.Context, timetableID uuid.UUID) (ValidationResult, error) {
	metadata, err := s.store.validationContext(ctx, timetableID)
	if err != nil {
		return ValidationResult{}, err
	}
	entries, err := s.store.validationEntries(ctx, timetableID)
	if err != nil {
		return ValidationResult{}, err
	}
	crossBookings, err := s.store.crossBookings(ctx, metadata.AcademicYearID, timetableID)
	if err != nil {
		return ValidationResult{}, err
	}
	issues := make([]ValidationIssue, 0)
	addError := func(day, period int16, format string, args ...any) {
		d, p := day, period
		issues = append(issues, ValidationIssue{Severity: "error", Message: fmt.Sprintf(format, args...), DayOfWeek: &d, PeriodNumber: &p})
	}
	for _, entry := range entries {
		if entry.OptionBlockID != nil {
			if err := s.validateBlockEntry(ctx, metadata, entry, crossBookings, addError); err != nil {
				return ValidationResult{}, err
			}
			continue
		}
		if entry.TeacherID != nil {
			teacherID := *entry.TeacherID
			for _, booking := range crossBookings {
				if booking.TeacherID != nil && *booking.TeacherID == teacherID && booking.DayOfWeek == entry.DayOfWeek && booking.PeriodNumber == entry.PeriodNumber {
					addError(entry.DayOfWeek, entry.PeriodNumber, "Teacher %s is already booked for %s at this time", nameOrID(entry.TeacherName, teacherID), booking.ClassName)
				}
			}
			unavailable, err := s.store.teacherUnavailable(ctx, teacherID, metadata.AcademicYearID, entry.DayOfWeek, entry.PeriodNumber)
			if err == nil && unavailable {
				addError(entry.DayOfWeek, entry.PeriodNumber, "Teacher %s marked themselves unavailable at this time", nameOrID(entry.TeacherName, teacherID))
			}
			if entry.SubjectID != nil {
				subjectID := *entry.SubjectID
				isFormTeacher := metadata.FormTeacherID != nil && *metadata.FormTeacherID == teacherID
				if !isFormTeacher {
					assignedTeacherID, err := s.store.classSubjectTeacher(ctx, metadata.ClassID, subjectID)
					if err == nil && assignedTeacherID != teacherID {
						addError(entry.DayOfWeek, entry.PeriodNumber, "%s is not the class's assigned teacher for this subject", nameOrID(entry.TeacherName, teacherID))
					} else if errors.Is(err, pgx.ErrNoRows) {
						assigned, err := s.store.teacherAssignedSubject(ctx, teacherID, subjectID)
						if err == nil && !assigned {
							addError(entry.DayOfWeek, entry.PeriodNumber, "%s is not assigned to teach this subject", nameOrID(entry.TeacherName, teacherID))
						}
					}
				}
			}
		}
		if entry.ClassroomID != nil {
			for _, booking := range crossBookings {
				if booking.ClassroomID != nil && *booking.ClassroomID == *entry.ClassroomID && booking.DayOfWeek == entry.DayOfWeek && booking.PeriodNumber == entry.PeriodNumber {
					addError(entry.DayOfWeek, entry.PeriodNumber, "Classroom is already booked by %s at this time", booking.ClassName)
				}
			}
		}
	}
	if requirements, err := s.store.requirements(ctx, metadata.AcademicYearID, metadata.GradeID); err == nil {
		if counts, err := s.store.entrySubjectCounts(ctx, timetableID); err == nil {
			for _, requirement := range requirements {
				if got := counts[requirement.SubjectID]; got < requirement.PeriodsPerWeek {
					issues = append(issues, ValidationIssue{Severity: "error", Message: fmt.Sprintf("%s requires %d period(s)/week, only %d scheduled", requirement.SubjectName, requirement.PeriodsPerWeek, got)})
				}
			}
		}
	}
	reviewers, err := s.store.authorizedReviewers(ctx, metadata.AcademicYearID, metadata.GradeID)
	if err != nil {
		return ValidationResult{}, err
	}
	if len(reviewers) == 0 {
		issues = append(issues, ValidationIssue{Severity: "error", Message: "No section head assigned for this grade — cannot submit for review"})
	}
	result := ValidationResult{Valid: true, Issues: issues}
	for _, issue := range issues {
		if issue.Severity == "error" {
			result.Valid = false
			break
		}
	}
	return result, nil
}

// validateBlockEntry checks each teacher of an option block period; the same block in another
// class is the same lesson, so it is not a clash.
func (s *validationService) validateBlockEntry(ctx context.Context, metadata validationContext, entry TimetableEntry, bookings []crossBooking, addError func(int16, int16, string, ...any)) error {
	teachers, err := s.store.blockTeachers(ctx, metadata.ClassID, *entry.OptionBlockID)
	if err != nil {
		return err
	}
	block := nameOrID(entry.OptionBlockName, *entry.OptionBlockID)
	if len(teachers) == 0 {
		addError(entry.DayOfWeek, entry.PeriodNumber, "No teacher is assigned for any subject of %s in this class", block)
	}
	for _, teacher := range teachers {
		for _, booking := range bookings {
			sameBlock := booking.OptionBlockID != nil && *booking.OptionBlockID == *entry.OptionBlockID
			if !sameBlock && booking.TeacherID != nil && *booking.TeacherID == teacher.ID && booking.DayOfWeek == entry.DayOfWeek && booking.PeriodNumber == entry.PeriodNumber {
				addError(entry.DayOfWeek, entry.PeriodNumber, "Teacher %s (%s) is already booked for %s at this time", teacher.Name, block, booking.ClassName)
			}
		}
		if unavailable, err := s.store.teacherUnavailable(ctx, teacher.ID, metadata.AcademicYearID, entry.DayOfWeek, entry.PeriodNumber); err == nil && unavailable {
			addError(entry.DayOfWeek, entry.PeriodNumber, "Teacher %s (%s) marked themselves unavailable at this time", teacher.Name, block)
		}
	}
	return nil
}

func nameOrID(name *string, id uuid.UUID) string {
	if name != nil {
		return *name
	}
	return id.String()
}

type validationHandler struct{ service *validationService }

func newValidationHandler(store timetableValidationStore) *validationHandler {
	return &validationHandler{service: &validationService{store: store}}
}
func (h *validationHandler) validate(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	result, err := h.service.validate(c.Request.Context(), id)
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}
