package academics

import (
	"context"
	"errors"
	"fmt"
	"github.com/openschool-org/openschool/internal/apierror"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/platform/httpx"
)

var (
	ErrLevelHasNoGroups    = errors.New("level has no selection groups configured")
	ErrEnrollmentInvalid   = errors.New("enrollment picks failed validation")
	ErrEnrollmentLocked    = errors.New("subject selection is locked and can no longer be changed — ask an admin to unlock it")
	ErrEnrollmentNotLocked = errors.New("subject selection is not locked")
	ErrEnrollmentEmpty     = errors.New("submit at least one pick before confirming")
)

type enrollmentGroup struct {
	ID       uuid.UUID
	Label    string
	Min, Max int32
	Subjects []uuid.UUID
}
type enrollmentStore interface {
	groups(context.Context, uuid.UUID) ([]enrollmentGroup, error)
	replace(context.Context, uuid.UUID, uuid.UUID, uuid.UUID, []EnrollmentPick) error
	locked(context.Context, uuid.UUID, uuid.UUID, uuid.UUID) (bool, error)
	lock(context.Context, uuid.UUID, uuid.UUID, uuid.UUID) error
	unlock(context.Context, uuid.UUID, uuid.UUID, uuid.UUID) (int64, error)
	remove(context.Context, uuid.UUID, uuid.UUID, uuid.UUID, uuid.UUID) error
	groupLevel(context.Context, uuid.UUID) (uuid.UUID, error)
	list(context.Context, uuid.UUID, uuid.UUID) ([]EnrollmentResponse, error)
	bySubject(context.Context, uuid.UUID, uuid.UUID) ([]EnrolledStudentResponse, error)
	byGroup(context.Context, uuid.UUID, uuid.UUID) ([]EnrolledStudentResponse, error)
}
type enrollmentService struct{ store enrollmentStore }

// StudentEnrollment exposes only the enrollment operations needed by the
// signed-in student's self-service endpoints.
type StudentEnrollment interface {
	ListByStudentAndLevel(context.Context, uuid.UUID, uuid.UUID, uuid.UUID) ([]EnrollmentResponse, error)
	IsLocked(context.Context, uuid.UUID, uuid.UUID, uuid.UUID) (bool, error)
	Submit(context.Context, uuid.UUID, SubmitEnrollmentRequest) ([]GroupValidationError, error)
	Confirm(context.Context, uuid.UUID, uuid.UUID, uuid.UUID) error
}

func NewStudentEnrollment(store enrollmentStore) StudentEnrollment {
	return &enrollmentService{store: store}
}

func (s *enrollmentService) ListByStudentAndLevel(ctx context.Context, student, level, year uuid.UUID) ([]EnrollmentResponse, error) {
	rows, err := s.store.list(ctx, student, year)
	if err != nil {
		return nil, err
	}
	out := make([]EnrollmentResponse, 0, len(rows))
	for _, row := range rows {
		if row.LevelID == level.String() {
			out = append(out, row)
		}
	}
	return out, nil
}

func (s *enrollmentService) IsLocked(ctx context.Context, student, level, year uuid.UUID) (bool, error) {
	return s.store.locked(ctx, student, level, year)
}

func (s *enrollmentService) Submit(ctx context.Context, student uuid.UUID, req SubmitEnrollmentRequest) ([]GroupValidationError, error) {
	return s.submit(ctx, student, req)
}

func (s *enrollmentService) Confirm(ctx context.Context, student, level, year uuid.UUID) error {
	picks, err := s.ListByStudentAndLevel(ctx, student, level, year)
	if err != nil {
		return err
	}
	if len(picks) == 0 {
		return ErrEnrollmentEmpty
	}
	return s.store.lock(ctx, student, level, year)
}

func (s *enrollmentService) validate(ctx context.Context, level uuid.UUID, picks []EnrollmentPick) ([]GroupValidationError, error) {
	groups, err := s.store.groups(ctx, level)
	if err != nil {
		return nil, err
	}
	if len(groups) == 0 {
		return nil, ErrLevelHasNoGroups
	}
	belongs := map[uuid.UUID]bool{}
	chosen := map[uuid.UUID][]uuid.UUID{}
	for _, g := range groups {
		belongs[g.ID] = true
	}
	var out []GroupValidationError
	for _, p := range picks {
		gid, e := uuid.Parse(p.GroupID)
		if e != nil {
			return nil, fmt.Errorf("invalid group_id %q", p.GroupID)
		}
		sid, e := uuid.Parse(p.SubjectID)
		if e != nil {
			return nil, fmt.Errorf("invalid subject_id %q", p.SubjectID)
		}
		if !belongs[gid] {
			out = append(out, GroupValidationError{GroupID: gid.String(), Message: "group does not belong to this level"})
			continue
		}
		chosen[gid] = append(chosen[gid], sid)
	}
	for _, g := range groups {
		allowed := map[uuid.UUID]bool{}
		for _, id := range g.Subjects {
			allowed[id] = true
		}
		seen := map[uuid.UUID]bool{}
		valid := int32(0)
		for _, id := range chosen[g.ID] {
			if seen[id] {
				out = append(out, GroupValidationError{GroupID: g.ID.String(), Label: g.Label, Message: fmt.Sprintf("subject %s selected more than once", id)})
			} else if !allowed[id] {
				out = append(out, GroupValidationError{GroupID: g.ID.String(), Label: g.Label, Message: fmt.Sprintf("subject %s is not an option in this group", id)})
			} else {
				valid++
			}
			seen[id] = true
		}
		if valid < g.Min || valid > g.Max {
			word := "subjects"
			if g.Min == 1 && g.Max == 1 {
				word = "subject"
			}
			expected := fmt.Sprintf("between %d and %d", g.Min, g.Max)
			if g.Min == g.Max {
				expected = fmt.Sprintf("%d", g.Min)
			}
			out = append(out, GroupValidationError{GroupID: g.ID.String(), Label: g.Label, Message: fmt.Sprintf("expected %s %s, got %d", expected, word, valid)})
		}
	}
	return out, nil
}
func (s *enrollmentService) submit(ctx context.Context, student uuid.UUID, req SubmitEnrollmentRequest) ([]GroupValidationError, error) {
	year, e := uuid.Parse(req.AcademicYearID)
	if e != nil {
		return nil, errors.New("invalid academic_year_id")
	}
	level, e := uuid.Parse(req.LevelID)
	if e != nil {
		return nil, errors.New("invalid level_id")
	}
	locked, e := s.store.locked(ctx, student, level, year)
	if e != nil {
		return nil, e
	}
	if locked {
		return nil, ErrEnrollmentLocked
	}
	errs, e := s.validate(ctx, level, req.Picks)
	if e != nil {
		return nil, e
	}
	if len(errs) > 0 {
		return errs, ErrEnrollmentInvalid
	}
	if e = s.store.replace(ctx, student, year, level, req.Picks); e != nil {
		return nil, e
	}
	return nil, nil
}
func (s *enrollmentService) remove(ctx context.Context, student, year, group, subject uuid.UUID) error {
	level, err := s.store.groupLevel(ctx, group)
	if err != nil {
		return fmt.Errorf("selection group not found: %w", err)
	}
	locked, err := s.store.locked(ctx, student, level, year)
	if err != nil {
		return err
	}
	if locked {
		return ErrEnrollmentLocked
	}
	return s.store.remove(ctx, student, year, group, subject)
}

func RegisterEnrollmentRoutes(admin, teacherOrAdmin, studentAccess, protected *gin.RouterGroup, store enrollmentStore) {
	h := &enrollmentHandler{service: &enrollmentService{store: store}}
	admin.POST("/students/:id/enrollments", h.submit)
	admin.DELETE("/students/:id/enrollments/lock/:level_id", h.unlock)
	admin.DELETE("/students/:id/enrollments/:group_id/:subject_id", h.remove)
	studentAccess.GET("/students/:id/enrollments", h.list)
	teacherOrAdmin.GET("/subjects/:id/students", h.subject)
	teacherOrAdmin.GET("/groups/:group_id/students", h.group)
	protected.POST("/enrollments/validate", h.validate)
}

type enrollmentHandler struct{ service *enrollmentService }

func parseEnrollmentID(c *gin.Context, name, message string) (uuid.UUID, bool) {
	id, e := uuid.Parse(c.Param(name))
	if e != nil {
		c.JSON(400, gin.H{"error": message})
		return uuid.Nil, false
	}
	return id, true
}
func academicYear(c *gin.Context) (uuid.UUID, bool) {
	v := c.Query("academic_year_id")
	if v == "" {
		c.JSON(400, gin.H{"error": "academic_year_id is required"})
		return uuid.Nil, false
	}
	id, e := uuid.Parse(v)
	if e != nil {
		c.JSON(400, gin.H{"error": "invalid academic_year_id"})
		return uuid.Nil, false
	}
	return id, true
}
func (h *enrollmentHandler) validate(c *gin.Context) {
	var r SubmitEnrollmentRequest
	if e := httpx.BindStrict(c, &r); e != nil {
		c.JSON(400, gin.H{"error": e.Error()})
		return
	}
	id, e := uuid.Parse(r.LevelID)
	if e != nil {
		c.JSON(400, gin.H{"error": "invalid level_id"})
		return
	}
	errs, e := h.service.validate(c, id, r.Picks)
	if e != nil {
		if errors.Is(e, ErrLevelHasNoGroups) {
			c.JSON(404, gin.H{"error": e.Error()})
		} else {
			apierror.Respond(c, e)
		}
		return
	}
	c.JSON(200, EnrollmentValidationResponse{Valid: len(errs) == 0, Errors: errs})
}
func (h *enrollmentHandler) submit(c *gin.Context) {
	student, ok := parseEnrollmentID(c, "id", "invalid student id")
	if !ok {
		return
	}
	var r SubmitEnrollmentRequest
	if e := httpx.BindStrict(c, &r); e != nil {
		c.JSON(400, gin.H{"error": e.Error()})
		return
	}
	errs, e := h.service.submit(c, student, r)
	if e != nil {
		if errors.Is(e, ErrEnrollmentInvalid) {
			c.JSON(422, EnrollmentValidationResponse{Errors: errs})
		} else if errors.Is(e, ErrLevelHasNoGroups) {
			c.JSON(404, gin.H{"error": e.Error()})
		} else if errors.Is(e, ErrEnrollmentLocked) {
			c.JSON(409, gin.H{"error": e.Error()})
		} else {
			apierror.Respond(c, e)
		}
		return
	}
	c.JSON(200, EnrollmentValidationResponse{Valid: true})
}
func (h *enrollmentHandler) list(c *gin.Context) {
	id, ok := parseEnrollmentID(c, "id", "invalid student id")
	if !ok {
		return
	}
	year, ok := academicYear(c)
	if !ok {
		return
	}
	v, e := h.service.store.list(c, id, year)
	if e != nil {
		apierror.Respond(c, e)
		return
	}
	c.JSON(200, v)
}
func (h *enrollmentHandler) subject(c *gin.Context) {
	id, ok := parseEnrollmentID(c, "id", "invalid subject id")
	if !ok {
		return
	}
	year, ok := academicYear(c)
	if !ok {
		return
	}
	v, e := h.service.store.bySubject(c, id, year)
	if e != nil {
		apierror.Respond(c, e)
		return
	}
	c.JSON(200, v)
}
func (h *enrollmentHandler) group(c *gin.Context) {
	id, ok := parseEnrollmentID(c, "group_id", "invalid group id")
	if !ok {
		return
	}
	year, ok := academicYear(c)
	if !ok {
		return
	}
	v, e := h.service.store.byGroup(c, id, year)
	if e != nil {
		apierror.Respond(c, e)
		return
	}
	c.JSON(200, v)
}
func (h *enrollmentHandler) remove(c *gin.Context) {
	student, ok := parseEnrollmentID(c, "id", "invalid student id")
	if !ok {
		return
	}
	group, ok := parseEnrollmentID(c, "group_id", "invalid group id")
	if !ok {
		return
	}
	subject, ok := parseEnrollmentID(c, "subject_id", "invalid subject id")
	if !ok {
		return
	}
	year, ok := academicYear(c)
	if !ok {
		return
	}
	if e := h.service.remove(c, student, year, group, subject); e != nil {
		apierror.Respond(c, e)
		return
	}
	c.JSON(200, gin.H{"message": "enrollment removed"})
}
func (h *enrollmentHandler) unlock(c *gin.Context) {
	student, ok := parseEnrollmentID(c, "id", "invalid student id")
	if !ok {
		return
	}
	level, ok := parseEnrollmentID(c, "level_id", "invalid level id")
	if !ok {
		return
	}
	year, ok := academicYear(c)
	if !ok {
		return
	}
	n, e := h.service.store.unlock(c, student, level, year)
	if e != nil {
		apierror.Respond(c, e)
		return
	}
	if n == 0 {
		c.JSON(404, gin.H{"error": ErrEnrollmentNotLocked.Error()})
		return
	}
	c.JSON(200, gin.H{"message": "subject selection unlocked"})
}
