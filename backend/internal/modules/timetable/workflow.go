package timetable

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/apierror"
	"github.com/openschool-org/openschool/internal/middleware"
)

var (
	errWorkflowInvalidTransition = errors.New("timetable is not in the required status for this action")
	errWorkflowUnauthorized      = errors.New("you are not an authorized section head for this timetable's grade")
	errWorkflowValidation        = errors.New("timetable has unresolved validation issues")
)

type workflowClass struct {
	ID      uuid.UUID
	GradeID uuid.UUID
	Name    string
}

type workflowTeacher struct {
	ID     uuid.UUID
	UserID uuid.UUID
}

type reviewQueueItem struct {
	Timetable
	ClassName string `json:"class_name"`
	GradeName string `json:"grade_name"`
}

type timetableNotifier interface {
	SendDirect(context.Context, string, string, string, string, uuid.UUID, []uuid.UUID) error
}

type workflowStore interface {
	get(context.Context, uuid.UUID) (Timetable, error)
	class(context.Context, uuid.UUID) (workflowClass, error)
	teacherByUser(context.Context, uuid.UUID) (workflowTeacher, error)
	teachersByIDs(context.Context, []uuid.UUID) ([]workflowTeacher, error)
	// classLeaders: the whole-grade head, the class's stream head and the grade-section head.
	classLeaders(context.Context, uuid.UUID) ([]uuid.UUID, error)
	listReviewQueue(ctx context.Context, yearID, teacherID uuid.UUID) ([]reviewQueueItem, error)
	submit(context.Context, uuid.UUID, uuid.UUID) (Timetable, error)
	approve(context.Context, uuid.UUID, uuid.UUID, string) (Timetable, error)
	reject(context.Context, uuid.UUID, uuid.UUID, string) (Timetable, error)
	archivePublished(context.Context, uuid.UUID, uuid.UUID) error
	publish(context.Context, uuid.UUID, uuid.UUID) (Timetable, error)
	addStatusHistory(context.Context, uuid.UUID, string, string, uuid.UUID, string) error
	entries(context.Context, uuid.UUID) ([]TimetableEntry, error)
	studentUsersAndIDs(context.Context, uuid.UUID) ([]uuid.UUID, []uuid.UUID, error)
	guardianUsers(context.Context, []uuid.UUID) ([]uuid.UUID, error)
}

type workflowService struct {
	store    workflowStore
	validate *validationService
	notify   timetableNotifier
}

// NewWorkflowRepository exposes the timetable module's repository adapter to
// the composition root without exposing generated sqlc types.
func NewWorkflowRepository(pool *pgxpool.Pool) *timetableRepository {
	return newTimetableRepository(pool)
}

// NewWorkflowValidator creates the validator used by submit workflow actions.
func NewWorkflowValidator(pool *pgxpool.Pool) *validationService {
	return &validationService{store: newTimetableEntryRepository(pool)}
}

func (s *workflowService) submit(ctx context.Context, id, actor uuid.UUID) (Timetable, error) {
	timetable, err := s.store.get(ctx, id)
	if err != nil {
		return Timetable{}, err
	}
	if timetable.Status != statusDraft {
		return Timetable{}, errWorkflowInvalidTransition
	}
	result, err := s.validate.validate(ctx, id)
	if err != nil {
		return Timetable{}, err
	}
	if !result.Valid {
		return Timetable{}, fmt.Errorf("%w (%d issue(s))", errWorkflowValidation, len(result.Issues))
	}
	updated, err := s.store.submit(ctx, id, actor)
	if err != nil {
		return Timetable{}, err
	}
	if err := s.store.addStatusHistory(ctx, id, statusDraft, statusUnderReview, actor, ""); err != nil {
		log.Printf("timetable %s: failed to record submit history: %v", id, err)
	}
	s.notifySubmit(ctx, timetable, actor)
	return updated, nil
}

func (s *workflowService) approve(ctx context.Context, id, actor uuid.UUID, comment string) (Timetable, error) {
	timetable, reviewer, class, err := s.authorizedReview(ctx, id, actor, statusUnderReview)
	if err != nil {
		return Timetable{}, err
	}
	updated, err := s.store.approve(ctx, id, reviewer.ID, comment)
	if err != nil {
		return Timetable{}, err
	}
	if err := s.store.addStatusHistory(ctx, id, statusUnderReview, statusApproved, actor, comment); err != nil {
		log.Printf("timetable %s: failed to record approval history: %v", id, err)
	}
	s.notifyDirect(ctx, "Timetable Approved", fmt.Sprintf("The timetable for %s was approved.", class.Name), "normal", actor, []uuid.UUID{timetable.CreatedBy})
	return updated, nil
}

func (s *workflowService) reject(ctx context.Context, id, actor uuid.UUID, comment string) (Timetable, error) {
	timetable, reviewer, class, err := s.authorizedReview(ctx, id, actor, statusUnderReview)
	if err != nil {
		return Timetable{}, err
	}
	updated, err := s.store.reject(ctx, id, reviewer.ID, comment)
	if err != nil {
		return Timetable{}, err
	}
	if err := s.store.addStatusHistory(ctx, id, statusUnderReview, statusRejected, actor, comment); err != nil {
		log.Printf("timetable %s: failed to record rejection history: %v", id, err)
	}
	s.notifyDirect(ctx, "Timetable Rejected", fmt.Sprintf("The timetable for %s was rejected: %s", class.Name, comment), "important", actor, []uuid.UUID{timetable.CreatedBy})
	return updated, nil
}

func (s *workflowService) authorizedReview(ctx context.Context, id, actor uuid.UUID, requiredStatus string) (Timetable, workflowTeacher, workflowClass, error) {
	timetable, err := s.store.get(ctx, id)
	if err != nil {
		return Timetable{}, workflowTeacher{}, workflowClass{}, err
	}
	if timetable.Status != requiredStatus {
		return Timetable{}, workflowTeacher{}, workflowClass{}, errWorkflowInvalidTransition
	}
	reviewer, err := s.store.teacherByUser(ctx, actor)
	if err != nil {
		return Timetable{}, workflowTeacher{}, workflowClass{}, errors.New("no teacher profile linked to this account")
	}
	class, err := s.store.class(ctx, timetable.ClassID)
	if err != nil {
		return Timetable{}, workflowTeacher{}, workflowClass{}, err
	}
	reviewers, err := s.store.classLeaders(ctx, class.ID)
	if err != nil {
		return Timetable{}, workflowTeacher{}, workflowClass{}, err
	}
	for _, reviewerID := range reviewers {
		if reviewerID == reviewer.ID {
			return timetable, reviewer, class, nil
		}
	}
	return Timetable{}, workflowTeacher{}, workflowClass{}, errWorkflowUnauthorized
}

func (s *workflowService) publish(ctx context.Context, id, actor uuid.UUID) (Timetable, error) {
	timetable, err := s.store.get(ctx, id)
	if err != nil {
		return Timetable{}, err
	}
	if timetable.Status != statusApproved {
		return Timetable{}, errWorkflowInvalidTransition
	}
	if err := s.store.archivePublished(ctx, timetable.ClassID, timetable.AcademicYearID); err != nil {
		return Timetable{}, err
	}
	updated, err := s.store.publish(ctx, id, actor)
	if err != nil {
		return Timetable{}, err
	}
	if err := s.store.addStatusHistory(ctx, id, statusApproved, statusPublished, actor, ""); err != nil {
		log.Printf("timetable %s: failed to record publication history: %v", id, err)
	}
	s.notifyPublication(ctx, updated, actor)
	return updated, nil
}

func (s *workflowService) reviewQueue(ctx context.Context, actor, yearID uuid.UUID) ([]reviewQueueItem, error) {
	teacher, err := s.store.teacherByUser(ctx, actor)
	if err != nil {
		return []reviewQueueItem{}, nil
	}
	return s.store.listReviewQueue(ctx, yearID, teacher.ID)
}

func (s *workflowService) notifySubmit(ctx context.Context, timetable Timetable, actor uuid.UUID) {
	class, err := s.store.class(ctx, timetable.ClassID)
	if err != nil {
		return
	}
	reviewerIDs, err := s.store.classLeaders(ctx, class.ID)
	if err != nil {
		return
	}
	teachers, err := s.store.teachersByIDs(ctx, reviewerIDs)
	if err != nil {
		return
	}
	userIDs := make([]uuid.UUID, 0, len(teachers))
	for _, teacher := range teachers {
		userIDs = append(userIDs, teacher.UserID)
	}
	s.notifyDirect(ctx, "Timetable Submitted for Review", fmt.Sprintf("A timetable for %s is waiting for your review.", class.Name), "normal", actor, userIDs)
}

func (s *workflowService) notifyPublication(ctx context.Context, timetable Timetable, actor uuid.UUID) {
	class, err := s.store.class(ctx, timetable.ClassID)
	if err != nil {
		return
	}
	seen := make(map[uuid.UUID]bool)
	userIDs := make([]uuid.UUID, 0)
	add := func(id uuid.UUID) {
		if id != uuid.Nil && !seen[id] {
			seen[id] = true
			userIDs = append(userIDs, id)
		}
	}
	entries, err := s.store.entries(ctx, timetable.ID)
	if err == nil {
		teacherIDs := make(map[uuid.UUID]bool)
		for _, entry := range entries {
			if entry.TeacherID != nil {
				teacherIDs[*entry.TeacherID] = true
			}
		}
		ids := make([]uuid.UUID, 0, len(teacherIDs))
		for id := range teacherIDs {
			ids = append(ids, id)
		}
		if teachers, err := s.store.teachersByIDs(ctx, ids); err == nil {
			for _, teacher := range teachers {
				add(teacher.UserID)
			}
		}
	}
	studentUsers, studentIDs, err := s.store.studentUsersAndIDs(ctx, timetable.ClassID)
	if err == nil {
		for _, userID := range studentUsers {
			add(userID)
		}
		if guardianUsers, err := s.store.guardianUsers(ctx, studentIDs); err == nil {
			for _, userID := range guardianUsers {
				add(userID)
			}
		}
	}
	s.notifyDirect(ctx, "Timetable Published", fmt.Sprintf("The timetable for %s has been published.", class.Name), "normal", actor, userIDs)
}

func (s *workflowService) notifyDirect(ctx context.Context, title, message, priority string, actor uuid.UUID, users []uuid.UUID) {
	if s.notify != nil {
		_ = s.notify.SendDirect(ctx, title, message, "timetable", priority, actor, users)
	}
}

type workflowHandler struct{ service *workflowService }

func (h *workflowHandler) actor(c *gin.Context) (uuid.UUID, bool) {
	id, err := middleware.UserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return uuid.Nil, false
	}
	return id, true
}

func (h *workflowHandler) writeError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, errWorkflowUnauthorized):
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
	case errors.Is(err, errWorkflowValidation):
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
	case errors.Is(err, errWorkflowInvalidTransition):
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	}
}

func RegisterTimetableWorkflowRoutes(admin, teacherOrAdmin, teacher *gin.RouterGroup, store workflowStore, validator *validationService, notifier timetableNotifier) {
	handler := &workflowHandler{service: &workflowService{store: store, validate: validator, notify: notifier}}
	admin.POST("/timetables/:id/submit", handler.submit)
	admin.POST("/timetables/:id/publish", handler.publish)
	teacher.POST("/timetables/:id/approve", handler.approve)
	teacher.POST("/timetables/:id/reject", handler.reject)
	teacher.GET("/t/timetable/reviews", handler.reviewQueue)
}

func (h *workflowHandler) submit(c *gin.Context) {
	actor, ok := h.actor(c)
	if !ok {
		return
	}
	id, ok := parseTimetableID(c)
	if !ok {
		return
	}
	result, err := h.service.submit(c.Request.Context(), id, actor)
	if err != nil {
		h.writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *workflowHandler) approve(c *gin.Context) {
	h.review(c, true)
}

func (h *workflowHandler) reject(c *gin.Context) {
	h.review(c, false)
}

func (h *workflowHandler) review(c *gin.Context, approve bool) {
	actor, ok := h.actor(c)
	if !ok {
		return
	}
	id, ok := parseTimetableID(c)
	if !ok {
		return
	}
	var request struct {
		Comment string `json:"comment"`
	}
	if err := c.ShouldBindJSON(&request); err != nil && err.Error() != "EOF" {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var result Timetable
	var err error
	if approve {
		result, err = h.service.approve(c.Request.Context(), id, actor, request.Comment)
	} else {
		if request.Comment == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "comment is required"})
			return
		}
		result, err = h.service.reject(c.Request.Context(), id, actor, request.Comment)
	}
	if err != nil {
		h.writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *workflowHandler) publish(c *gin.Context) {
	actor, ok := h.actor(c)
	if !ok {
		return
	}
	id, ok := parseTimetableID(c)
	if !ok {
		return
	}
	result, err := h.service.publish(c.Request.Context(), id, actor)
	if err != nil {
		h.writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *workflowHandler) reviewQueue(c *gin.Context) {
	actor, ok := h.actor(c)
	if !ok {
		return
	}
	yearID, err := uuid.Parse(c.Query("academic_year_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "a valid academic_year_id is required"})
		return
	}
	result, err := h.service.reviewQueue(c.Request.Context(), actor, yearID)
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

const (
	statusDraft       = "draft"
	statusUnderReview = "under_review"
	statusApproved    = "approved"
	statusRejected    = "rejected"
	statusPublished   = "published"
)
