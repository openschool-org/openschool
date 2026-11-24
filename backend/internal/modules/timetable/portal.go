package timetable

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/middleware"
)

type TeacherScheduleItem struct {
	DayOfWeek     int16      `json:"day_of_week"`
	PeriodNumber  int16      `json:"period_number"`
	SubjectID     *uuid.UUID `json:"subject_id"`
	SubjectName   *string    `json:"subject_name"`
	ClassroomID   *uuid.UUID `json:"classroom_id"`
	ClassroomName *string    `json:"classroom_name"`
	ClassroomType *string    `json:"classroom_type"`
	ClassID       uuid.UUID  `json:"class_id"`
	ClassName     string     `json:"class_name"`
	GradeName     string     `json:"grade_name"`
}

type portalStore interface {
	teacherByUser(context.Context, uuid.UUID) (workflowTeacher, error)
	teacherSchedule(context.Context, uuid.UUID, uuid.UUID) ([]TeacherScheduleItem, error)
	studentByUser(context.Context, uuid.UUID) (uuid.UUID, error)
	studentCurrentClass(context.Context, uuid.UUID) (uuid.UUID, uuid.UUID, error)
	publishedForClass(context.Context, uuid.UUID, uuid.UUID) (Timetable, []TimetableEntry, error)
	listByAcademicYear(context.Context, uuid.UUID) ([]TimetableListItem, error)
	periodsForClass(context.Context, uuid.UUID) ([]TimetablePeriod, error)
}

// PublishedSchedule is a class's published timetable with its bell schedule, so the week can be drawn as a grid.
type PublishedSchedule struct {
	Timetable Timetable         `json:"timetable"`
	Entries   []TimetableEntry  `json:"entries"`
	Periods   []TimetablePeriod `json:"periods"`
}

// published loads a class's timetable and its periods; a class with no bell schedule gets an empty list.
func (s *portalService) published(ctx context.Context, classID, yearID uuid.UUID) (PublishedSchedule, error) {
	timetable, entries, err := s.store.publishedForClass(ctx, classID, yearID)
	if err != nil {
		return PublishedSchedule{}, err
	}
	periods, err := s.store.periodsForClass(ctx, classID)
	if err != nil {
		return PublishedSchedule{}, err
	}
	if periods == nil {
		periods = []TimetablePeriod{}
	}
	return PublishedSchedule{Timetable: timetable, Entries: entries, Periods: periods}, nil
}

type portalService struct{ store portalStore }

// Reader is the stable timetable read contract used by parent and teacher-self
// aggregate handlers while those broader areas are migrated.
type Reader struct{ service *portalService }

func NewReader(pool *pgxpool.Pool) *Reader {
	return &Reader{service: &portalService{store: newTimetableRepository(pool)}}
}

func (r *Reader) GetPublishedForStudent(ctx context.Context, studentID uuid.UUID) (PublishedSchedule, error) {
	classID, yearID, err := r.service.store.studentCurrentClass(ctx, studentID)
	if err != nil {
		return PublishedSchedule{}, err
	}
	return r.service.published(ctx, classID, yearID)
}

func (r *Reader) ListByAcademicYear(ctx context.Context, yearID uuid.UUID) ([]TimetableListItem, error) {
	return r.service.store.listByAcademicYear(ctx, yearID)
}

func (s *portalService) teacherSchedule(ctx context.Context, userID, yearID uuid.UUID) ([]TeacherScheduleItem, error) {
	teacher, err := s.store.teacherByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	return s.store.teacherSchedule(ctx, teacher.ID, yearID)
}

func (s *portalService) studentSchedule(ctx context.Context, userID uuid.UUID) (PublishedSchedule, error) {
	studentID, err := s.store.studentByUser(ctx, userID)
	if err != nil {
		return PublishedSchedule{}, err
	}
	classID, yearID, err := s.store.studentCurrentClass(ctx, studentID)
	if err != nil {
		return PublishedSchedule{}, err
	}
	return s.published(ctx, classID, yearID)
}

func (s *portalService) classSchedule(ctx context.Context, classID, yearID uuid.UUID) (PublishedSchedule, error) {
	return s.published(ctx, classID, yearID)
}

type portalHandler struct{ service *portalService }

func RegisterTimetablePortalRoutes(teacher, student, teacherOrAdmin *gin.RouterGroup, store portalStore) {
	handler := &portalHandler{service: &portalService{store: store}}
	teacher.GET("/t/timetable", handler.teacherSchedule)
	student.GET("/timetable/my-class", handler.studentSchedule)
	teacherOrAdmin.GET("/timetables/published", handler.classSchedule)
}

func caller(c *gin.Context) (uuid.UUID, bool) {
	id, err := middleware.UserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return uuid.Nil, false
	}
	return id, true
}

func (h *portalHandler) teacherSchedule(c *gin.Context) {
	userID, ok := caller(c)
	if !ok {
		return
	}
	yearID, err := uuid.Parse(c.Query("academic_year_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "a valid academic_year_id is required"})
		return
	}
	result, err := h.service.teacherSchedule(c.Request.Context(), userID, yearID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no teacher profile linked to this account"})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *portalHandler) studentSchedule(c *gin.Context) {
	userID, ok := caller(c)
	if !ok {
		return
	}
	schedule, err := h.service.studentSchedule(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no published timetable found for your class"})
		return
	}
	c.JSON(http.StatusOK, schedule)
}

func (h *portalHandler) classSchedule(c *gin.Context) {
	classID, err := uuid.Parse(c.Query("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "a valid class_id is required"})
		return
	}
	yearID, err := uuid.Parse(c.Query("academic_year_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "a valid academic_year_id is required"})
		return
	}
	schedule, err := h.service.classSchedule(c.Request.Context(), classID, yearID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no published timetable for this class"})
		return
	}
	c.JSON(http.StatusOK, schedule)
}
