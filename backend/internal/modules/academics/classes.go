package academics

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/apierror"
	"github.com/openschool-org/openschool/internal/platform/httpx"
)

var ErrTeacherNotQualified = errors.New("teacher does not hold this subject as a qualification — assign it on the Teacher Subjects page first")

type Class struct {
	ID              uuid.UUID  `json:"id"`
	GradeID         uuid.UUID  `json:"grade_id"`
	AcademicYearID  uuid.UUID  `json:"academic_year_id"`
	FormTeacherID   *uuid.UUID `json:"form_teacher_id"`
	StreamID        *uuid.UUID `json:"stream_id"`
	StreamGroupID   *uuid.UUID `json:"stream_group_id"`
	GirlMonitorID   *uuid.UUID `json:"girl_monitor_id"`
	BoyMonitorID    *uuid.UUID `json:"boy_monitor_id"`
	MediumID        *uuid.UUID `json:"medium_id"`
	HomeClassroomID *uuid.UUID `json:"home_classroom_id"`
	Name            string     `json:"name"`
	CreatedAt       string     `json:"created_at"`
}
type ClassDetails struct {
	Class
	GradeName         string  `json:"grade_name"`
	AcademicYearLabel string  `json:"academic_year_label"`
	MediumName        *string `json:"medium_name"`
	HomeClassroomName *string `json:"home_classroom_name"`
}
type SubjectTeacher struct {
	SubjectID   uuid.UUID `json:"subject_id"`
	TeacherID   uuid.UUID `json:"teacher_id"`
	SubjectName string    `json:"subject_name"`
	SubjectCode string    `json:"subject_code"`
	TeacherName string    `json:"teacher_name"`
}
type createClassRequest struct {
	GradeID         uuid.UUID  `json:"grade_id" binding:"required"`
	AcademicYearID  uuid.UUID  `json:"academic_year_id" binding:"required"`
	Name            string     `json:"name" binding:"required"`
	FormTeacherID   *uuid.UUID `json:"form_teacher_id"`
	StreamID        *uuid.UUID `json:"stream_id"`
	StreamGroupID   *uuid.UUID `json:"stream_group_id"`
	MediumID        *uuid.UUID `json:"medium_id"`
	HomeClassroomID *uuid.UUID `json:"home_classroom_id"`
}
type updateClassRequest struct {
	Name            string     `json:"name" binding:"required"`
	FormTeacherID   *uuid.UUID `json:"form_teacher_id"`
	MediumID        *uuid.UUID `json:"medium_id"`
	HomeClassroomID *uuid.UUID `json:"home_classroom_id"`
}
type formTeacherRequest struct {
	TeacherID uuid.UUID `json:"teacher_id" binding:"required"`
}
type monitorsRequest struct {
	GirlMonitorID *uuid.UUID `json:"girl_monitor_id"`
	BoyMonitorID  *uuid.UUID `json:"boy_monitor_id"`
}
type subjectTeacherRequest struct {
	SubjectID uuid.UUID `json:"subject_id" binding:"required"`
	TeacherID uuid.UUID `json:"teacher_id" binding:"required"`
}

type classStore interface {
	create(context.Context, createClassRequest) (Class, error)
	backfillHomerooms(context.Context, uuid.UUID) (int, error)
	get(context.Context, uuid.UUID) (Class, error)
	listCurrent(context.Context) ([]ClassDetails, error)
	listByYear(context.Context, uuid.UUID) ([]ClassDetails, error)
	update(context.Context, uuid.UUID, updateClassRequest) (Class, error)
	delete(context.Context, uuid.UUID) error
	studentCount(context.Context, uuid.UUID) (int64, error)
	assignFormTeacher(context.Context, uuid.UUID, uuid.UUID) (Class, error)
	assignMonitors(context.Context, uuid.UUID, *uuid.UUID, *uuid.UUID) (Class, error)
	qualified(context.Context, uuid.UUID, uuid.UUID) (bool, error)
	assignSubjectTeacher(context.Context, uuid.UUID, uuid.UUID, uuid.UUID) error
	listSubjectTeachers(context.Context, uuid.UUID) ([]SubjectTeacher, error)
	enroll(context.Context, uuid.UUID, uuid.UUID) error
	unenroll(context.Context, uuid.UUID, uuid.UUID) error
}

type classService struct{ store classStore }

func (s *classService) create(c context.Context, r createClassRequest) (Class, error) {
	return s.store.create(c, r)
}
func (s *classService) get(c context.Context, id uuid.UUID) (Class, error) { return s.store.get(c, id) }
func (s *classService) current(c context.Context) ([]ClassDetails, error) {
	return s.store.listCurrent(c)
}
func (s *classService) byYear(c context.Context, id uuid.UUID) ([]ClassDetails, error) {
	return s.store.listByYear(c, id)
}
func (s *classService) update(c context.Context, id uuid.UUID, r updateClassRequest) (Class, error) {
	return s.store.update(c, id, r)
}
func (s *classService) delete(c context.Context, id uuid.UUID) error {
	n, err := s.store.studentCount(c, id)
	if err != nil {
		return err
	}
	if n > 0 {
		return fmt.Errorf("cannot delete class with %d enrolled students", n)
	}
	return s.store.delete(c, id)
}
func (s *classService) formTeacher(c context.Context, id, teacher uuid.UUID) (Class, error) {
	return s.store.assignFormTeacher(c, id, teacher)
}
func (s *classService) monitors(c context.Context, id uuid.UUID, r monitorsRequest) (Class, error) {
	return s.store.assignMonitors(c, id, r.GirlMonitorID, r.BoyMonitorID)
}
func (s *classService) subjectTeacher(c context.Context, id uuid.UUID, r subjectTeacherRequest) error {
	ok, err := s.store.qualified(c, r.TeacherID, r.SubjectID)
	if err != nil {
		return err
	}
	if !ok {
		return ErrTeacherNotQualified
	}
	return s.store.assignSubjectTeacher(c, id, r.SubjectID, r.TeacherID)
}

type classHandler struct{ service *classService }

func RegisterClassRoutes(admin, teacherOrAdmin *gin.RouterGroup, pool *pgxpool.Pool) {
	h := &classHandler{service: &classService{store: newClassRepository(pool)}}
	admin.POST("/classes", h.create)
	teacherOrAdmin.GET("/classes/current", h.current)
	teacherOrAdmin.GET("/classes/:id", h.get)
	admin.PUT("/classes/:id", h.update)
	admin.DELETE("/classes/:id", h.delete)
	admin.PUT("/classes/:id/form-teacher", h.formTeacher)
	admin.PUT("/classes/:id/monitors", h.monitors)
	admin.POST("/classes/:id/subject-teachers", h.subjectTeacher)
	admin.GET("/classes/:id/subject-teachers", h.subjectTeachers)
	teacherOrAdmin.GET("/academic-years/:academic_year_id/classes", h.byYear)
	admin.POST("/academic-years/:academic_year_id/classes/homerooms", h.backfillHomerooms)
	teacherOrAdmin.POST("/classes/:id/students/:student_id/enroll", h.enroll)
	teacherOrAdmin.DELETE("/classes/:id/students/:student_id/unenroll", h.unenroll)
}
func classID(c *gin.Context, name string) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Param(name))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return uuid.Nil, false
	}
	return id, true
}
func (h *classHandler) create(c *gin.Context) {
	var r createClassRequest
	if err := httpx.BindStrict(c, &r); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	v, e := h.service.create(c, r)
	if e != nil {
		c.JSON(400, gin.H{"error": e.Error()})
		return
	}
	c.JSON(201, v)
}

// backfillHomerooms links a homeroom to every class in the year that has none.
func (h *classHandler) backfillHomerooms(c *gin.Context) {
	year, ok := classID(c, "academic_year_id")
	if !ok {
		return
	}
	n, err := h.service.store.backfillHomerooms(c.Request.Context(), year)
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"linked": n})
}
func (h *classHandler) get(c *gin.Context) {
	id, ok := classID(c, "id")
	if !ok {
		return
	}
	v, e := h.service.get(c, id)
	if e != nil {
		c.JSON(404, gin.H{"error": "class not found"})
		return
	}
	c.JSON(200, v)
}
func (h *classHandler) current(c *gin.Context) {
	v, e := h.service.current(c)
	if e != nil {
		c.JSON(500, gin.H{"error": e.Error()})
		return
	}
	c.JSON(200, v)
}
func (h *classHandler) byYear(c *gin.Context) {
	id, ok := classID(c, "academic_year_id")
	if !ok {
		return
	}
	v, e := h.service.byYear(c, id)
	if e != nil {
		c.JSON(500, gin.H{"error": e.Error()})
		return
	}
	c.JSON(200, v)
}
func (h *classHandler) update(c *gin.Context) {
	id, ok := classID(c, "id")
	if !ok {
		return
	}
	var r updateClassRequest
	if e := httpx.BindStrict(c, &r); e != nil {
		c.JSON(400, gin.H{"error": e.Error()})
		return
	}
	v, e := h.service.update(c, id, r)
	if e != nil {
		c.JSON(400, gin.H{"error": e.Error()})
		return
	}
	c.JSON(200, v)
}
func (h *classHandler) delete(c *gin.Context) {
	id, ok := classID(c, "id")
	if !ok {
		return
	}
	if e := h.service.delete(c, id); e != nil {
		c.JSON(400, gin.H{"error": e.Error()})
		return
	}
	c.JSON(200, gin.H{"message": "class deleted"})
}
func (h *classHandler) formTeacher(c *gin.Context) {
	id, ok := classID(c, "id")
	if !ok {
		return
	}
	var r formTeacherRequest
	if e := httpx.BindStrict(c, &r); e != nil {
		c.JSON(400, gin.H{"error": e.Error()})
		return
	}
	v, e := h.service.formTeacher(c, id, r.TeacherID)
	if e != nil {
		c.JSON(400, gin.H{"error": e.Error()})
		return
	}
	c.JSON(200, v)
}
func (h *classHandler) monitors(c *gin.Context) {
	id, ok := classID(c, "id")
	if !ok {
		return
	}
	var r monitorsRequest
	if e := httpx.BindStrict(c, &r); e != nil {
		c.JSON(400, gin.H{"error": e.Error()})
		return
	}
	v, e := h.service.monitors(c, id, r)
	if e != nil {
		c.JSON(400, gin.H{"error": e.Error()})
		return
	}
	c.JSON(200, v)
}
func (h *classHandler) subjectTeacher(c *gin.Context) {
	id, ok := classID(c, "id")
	if !ok {
		return
	}
	var r subjectTeacherRequest
	if e := httpx.BindStrict(c, &r); e != nil {
		c.JSON(400, gin.H{"error": e.Error()})
		return
	}
	if e := h.service.subjectTeacher(c, id, r); e != nil {
		c.JSON(400, gin.H{"error": e.Error()})
		return
	}
	c.JSON(200, gin.H{"message": "subject teacher assigned"})
}
func (h *classHandler) subjectTeachers(c *gin.Context) {
	id, ok := classID(c, "id")
	if !ok {
		return
	}
	v, e := h.service.store.listSubjectTeachers(c, id)
	if e != nil {
		c.JSON(500, gin.H{"error": e.Error()})
		return
	}
	c.JSON(200, v)
}
func (h *classHandler) enroll(c *gin.Context) {
	id, ok := classID(c, "id")
	if !ok {
		return
	}
	student, ok := classID(c, "student_id")
	if !ok {
		return
	}
	if e := h.service.store.enroll(c, id, student); e != nil {
		c.JSON(400, gin.H{"error": e.Error()})
		return
	}
	c.JSON(200, gin.H{"message": "student enrolled"})
}
func (h *classHandler) unenroll(c *gin.Context) {
	id, ok := classID(c, "id")
	if !ok {
		return
	}
	student, ok := classID(c, "student_id")
	if !ok {
		return
	}
	if e := h.service.store.unenroll(c, id, student); e != nil {
		c.JSON(400, gin.H{"error": e.Error()})
		return
	}
	c.JSON(200, gin.H{"message": "student unenrolled"})
}
