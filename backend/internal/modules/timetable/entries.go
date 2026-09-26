package timetable

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/openschool-org/openschool/internal/apierror"
)

var errTimetableEntriesDraftOnly = fmt.Errorf("timetable can only be edited while in draft status")

const timetableStatusDraft = "draft"

type TimetableEntry struct {
	ID            uuid.UUID  `json:"id"`
	TimetableID   uuid.UUID  `json:"timetable_id"`
	DayOfWeek     int16      `json:"day_of_week"`
	PeriodNumber  int16      `json:"period_number"`
	SubjectID     *uuid.UUID `json:"subject_id"`
	TeacherID     *uuid.UUID `json:"teacher_id"`
	ClassroomID   *uuid.UUID `json:"classroom_id"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
	SubjectName   *string    `json:"subject_name"`
	TeacherName   *string    `json:"teacher_name"`
	ClassroomName *string    `json:"classroom_name"`
	// Set for an option block period: the class splits by subject, so there is no single subject or teacher.
	OptionBlockID   *uuid.UUID `json:"option_block_id"`
	OptionBlockName *string    `json:"option_block_name"`
}

type timetableEntryCommand struct {
	DayOfWeek    int16      `json:"day_of_week" binding:"required"`
	PeriodNumber int16      `json:"period_number" binding:"required"`
	SubjectID    *uuid.UUID `json:"subject_id"`
	TeacherID    *uuid.UUID `json:"teacher_id"`
	ClassroomID  *uuid.UUID `json:"classroom_id"`
}
type saveTimetableEntriesCommand struct {
	Entries []timetableEntryCommand `json:"entries" binding:"required"`
}

type timetableEntryStore interface {
	status(context.Context, uuid.UUID) (string, error)
	listEntries(context.Context, uuid.UUID) ([]TimetableEntry, error)
	upsertEntry(context.Context, uuid.UUID, timetableEntryCommand) error
	deleteEntry(context.Context, uuid.UUID, int16, int16) error
}

type timetableEntryService struct{ entries timetableEntryStore }

func (s *timetableEntryService) list(ctx context.Context, timetableID uuid.UUID) ([]TimetableEntry, error) {
	return s.entries.listEntries(ctx, timetableID)
}
func (s *timetableEntryService) save(ctx context.Context, timetableID uuid.UUID, command saveTimetableEntriesCommand) error {
	status, err := s.entries.status(ctx, timetableID)
	if err != nil {
		return err
	}
	if status != timetableStatusDraft {
		return errTimetableEntriesDraftOnly
	}
	for _, entry := range command.Entries {
		if err := s.entries.upsertEntry(ctx, timetableID, entry); err != nil {
			return err
		}
	}
	return nil
}
func (s *timetableEntryService) delete(ctx context.Context, timetableID uuid.UUID, day, period int16) error {
	status, err := s.entries.status(ctx, timetableID)
	if err != nil {
		return err
	}
	if status != timetableStatusDraft {
		return errTimetableEntriesDraftOnly
	}
	return s.entries.deleteEntry(ctx, timetableID, day, period)
}

type timetableEntryHandler struct{ service *timetableEntryService }

func newTimetableEntryHandler(store timetableEntryStore) *timetableEntryHandler {
	return &timetableEntryHandler{service: &timetableEntryService{entries: store}}
}
func parseEntryID(c *gin.Context) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return uuid.Nil, false
	}
	return id, true
}
func (h *timetableEntryHandler) list(c *gin.Context) {
	id, ok := parseEntryID(c)
	if !ok {
		return
	}
	entries, err := h.service.list(c.Request.Context(), id)
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, entries)
}
func (h *timetableEntryHandler) save(c *gin.Context) {
	id, ok := parseEntryID(c)
	if !ok {
		return
	}
	var command saveTimetableEntriesCommand
	if err := c.ShouldBindJSON(&command); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.service.save(c.Request.Context(), id, command); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	entries, err := h.service.list(c.Request.Context(), id)
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, entries)
}
func (h *timetableEntryHandler) delete(c *gin.Context) {
	id, ok := parseEntryID(c)
	if !ok {
		return
	}
	day, err := strconv.ParseInt(c.Param("day"), 10, 16)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid day"})
		return
	}
	period, err := strconv.ParseInt(c.Param("period"), 10, 16)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid period"})
		return
	}
	if err := h.service.delete(c.Request.Context(), id, int16(day), int16(period)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "entry cleared"})
}

func entryUUID(value pgtype.UUID) *uuid.UUID {
	if !value.Valid {
		return nil
	}
	result := uuid.UUID(value.Bytes)
	return &result
}
func entryText(value pgtype.Text) *string {
	if !value.Valid {
		return nil
	}
	result := value.String
	return &result
}
