package leave

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/apierror"
	"github.com/openschool-org/openschool/internal/authz"
	"github.com/openschool-org/openschool/internal/middleware"
	"github.com/openschool-org/openschool/internal/platform/httpx"
)

// TeacherResolver maps the signed-in account to its teacher profile.
type TeacherResolver interface {
	Resolve(context.Context, uuid.UUID) (uuid.UUID, error)
}

type handler struct {
	service  *Service
	teachers TeacherResolver
}

// RegisterRoutes mounts the applicant's endpoints on the teacher group and
// the approver's on teacherOrAdmin, where the service checks the position.
func RegisterRoutes(teacher, teacherOrAdmin *gin.RouterGroup, service *Service, teachers TeacherResolver) {
	h := &handler{service: service, teachers: teachers}
	teacher.GET("/me/teacher/leave", h.myRequests)
	teacher.POST("/me/teacher/leave", h.apply)
	teacher.GET("/me/teacher/leave/balance", h.myBalance)
	teacher.GET("/me/teacher/leave/periods", h.affectedPeriods)
	teacher.GET("/me/teacher/leave/relief-duties", h.myReliefDuties)
	teacher.POST("/me/teacher/leave/:id/cancel", h.cancel)

	teacherOrAdmin.GET("/leave/relief-candidates", h.reliefCandidates)
	teacherOrAdmin.GET("/leave/requests", h.register)
	teacherOrAdmin.GET("/leave/requests/:id", h.detail)
	teacherOrAdmin.POST("/leave/requests/:id/approve", h.decide(true))
	teacherOrAdmin.POST("/leave/requests/:id/reject", h.decide(false))
	teacherOrAdmin.GET("/leave/balances", h.balances)
	teacherOrAdmin.GET("/leave/relief", h.dailyRelief)
}

func (h *handler) teacherID(c *gin.Context) (uuid.UUID, uuid.UUID, bool) {
	userID, err := middleware.UserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return uuid.Nil, uuid.Nil, false
	}
	teacherID, err := h.teachers.Resolve(c, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no teacher profile linked to this account"})
		return uuid.Nil, uuid.Nil, false
	}
	return teacherID, userID, true
}

// actor resolves an approver-endpoint caller; an admin has no teacher profile.
func (h *handler) actor(c *gin.Context) (Actor, bool) {
	if middleware.HasRole(c, authz.RoleAdmin) {
		userID, err := middleware.UserIDFromContext(c)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
			return Actor{}, false
		}
		return Actor{UserID: userID, Admin: true}, true
	}
	teacherID, userID, ok := h.teacherID(c)
	return Actor{UserID: userID, TeacherID: teacherID}, ok
}

func (h *handler) apply(c *gin.Context) {
	teacherID, userID, ok := h.teacherID(c)
	if !ok {
		return
	}
	var req ApplyRequest
	if err := httpx.BindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	detail, err := h.service.Apply(c, teacherID, userID, req)
	if err != nil {
		respond(c, err)
		return
	}
	c.JSON(http.StatusCreated, detail)
}

func (h *handler) myRequests(c *gin.Context) {
	teacherID, _, ok := h.teacherID(c)
	if !ok {
		return
	}
	year, ok := yearParam(c)
	if !ok {
		return
	}
	requests, err := h.service.MyRequests(c, teacherID, year)
	if err != nil {
		respond(c, err)
		return
	}
	c.JSON(http.StatusOK, requests)
}

func (h *handler) myBalance(c *gin.Context) {
	teacherID, _, ok := h.teacherID(c)
	if !ok {
		return
	}
	year, ok := yearParam(c)
	if !ok {
		return
	}
	balance, err := h.service.MyBalance(c, teacherID, year)
	if err != nil {
		respond(c, err)
		return
	}
	c.JSON(http.StatusOK, balance)
}

func (h *handler) affectedPeriods(c *gin.Context) {
	teacherID, _, ok := h.teacherID(c)
	if !ok {
		return
	}
	periods, err := h.service.AffectedPeriods(c, teacherID, ApplyRequest{
		LeaveType: c.Query("leave_type"), StartDate: c.Query("start_date"), EndDate: c.Query("end_date"),
		DayPart: c.Query("day_part"), StartTime: c.Query("start_time"), EndTime: c.Query("end_time"),
	})
	if err != nil {
		respond(c, err)
		return
	}
	c.JSON(http.StatusOK, periods)
}

func (h *handler) myReliefDuties(c *gin.Context) {
	teacherID, _, ok := h.teacherID(c)
	if !ok {
		return
	}
	from := time.Now()
	if raw := c.Query("from"); raw != "" {
		parsed, err := time.Parse(time.DateOnly, raw)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid from date (expected YYYY-MM-DD)"})
			return
		}
		from = parsed
	}
	duties, err := h.service.MyReliefDuties(c, teacherID, from)
	if err != nil {
		respond(c, err)
		return
	}
	c.JSON(http.StatusOK, duties)
}

func (h *handler) cancel(c *gin.Context) {
	teacherID, userID, ok := h.teacherID(c)
	if !ok {
		return
	}
	id, ok := idParam(c)
	if !ok {
		return
	}
	if err := h.service.Cancel(c, teacherID, id, userID); err != nil {
		respond(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "leave application cancelled"})
}

// reliefCandidates leaves out the caller, or the applicant named by exclude_teacher_id.
func (h *handler) reliefCandidates(c *gin.Context) {
	date, err := time.Parse(time.DateOnly, c.Query("date"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid or missing date (expected YYYY-MM-DD)"})
		return
	}
	period, err := strconv.ParseInt(c.Query("period_number"), 10, 16)
	if err != nil || period < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid or missing period_number"})
		return
	}
	actor, ok := h.actor(c)
	if !ok {
		return
	}
	exclude := actor.TeacherID
	if raw := c.Query("exclude_teacher_id"); raw != "" {
		if exclude, err = uuid.Parse(raw); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid exclude_teacher_id"})
			return
		}
	}
	candidates, err := h.service.ReliefCandidates(c, date, int16(period), exclude)
	if err != nil {
		respond(c, err)
		return
	}
	c.JSON(http.StatusOK, candidates)
}

func (h *handler) register(c *gin.Context) {
	actor, ok := h.actor(c)
	if !ok {
		return
	}
	year, ok := yearParam(c)
	if !ok {
		return
	}
	status, leaveType := c.Query("status"), c.Query("leave_type")
	if status != "" && status != StatusPending && status != StatusApproved && status != StatusRejected && status != StatusCancelled {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid status"})
		return
	}
	if leaveType != "" && !validTypes[leaveType] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid leave_type"})
		return
	}
	page := httpx.ParsePage(c)
	result, err := h.service.Register(c, actor, RegisterFilter{
		Year: year, Status: status, LeaveType: leaveType, Search: page.Search, Limit: page.Limit, Offset: page.Offset,
	})
	if err != nil {
		respond(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *handler) detail(c *gin.Context) {
	actor, ok := h.actor(c)
	if !ok {
		return
	}
	id, ok := idParam(c)
	if !ok {
		return
	}
	detail, err := h.service.Detail(c, actor, id)
	if err != nil {
		respond(c, err)
		return
	}
	c.JSON(http.StatusOK, detail)
}

func (h *handler) decide(approve bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		actor, ok := h.actor(c)
		if !ok {
			return
		}
		id, ok := idParam(c)
		if !ok {
			return
		}
		var req DecisionRequest
		if err := httpx.BindStrict(c, &req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		detail, err := h.service.Decide(c, actor, id, approve, req.Note)
		if err != nil {
			respond(c, err)
			return
		}
		c.JSON(http.StatusOK, detail)
	}
}

func (h *handler) balances(c *gin.Context) {
	actor, ok := h.actor(c)
	if !ok {
		return
	}
	year, ok := yearParam(c)
	if !ok {
		return
	}
	page := httpx.ParsePage(c)
	result, err := h.service.Balances(c, actor, year, page.Search, page.Limit, page.Offset)
	if err != nil {
		respond(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *handler) dailyRelief(c *gin.Context) {
	actor, ok := h.actor(c)
	if !ok {
		return
	}
	date, err := time.Parse(time.DateOnly, c.Query("date"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid or missing date (expected YYYY-MM-DD)"})
		return
	}
	relief, err := h.service.DailyRelief(c, actor, date)
	if err != nil {
		respond(c, err)
		return
	}
	c.JSON(http.StatusOK, relief)
}

// yearParam reads ?year=, defaulting to the current calendar (leave) year.
func yearParam(c *gin.Context) (int, bool) {
	raw := c.Query("year")
	if raw == "" {
		return time.Now().Year(), true
	}
	year, err := strconv.Atoi(raw)
	if err != nil || year < 2000 || year > 2100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid year"})
		return 0, false
	}
	return year, true
}

func idParam(c *gin.Context) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return uuid.Nil, false
	}
	return id, true
}

func respond(c *gin.Context, err error) {
	var invalidErr InvalidError
	switch {
	case errors.As(err, &invalidErr):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	case errors.Is(err, ErrNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
	case errors.Is(err, ErrForbidden), errors.Is(err, ErrOwnLeave), errors.Is(err, ErrPrincipalLeave):
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
	case errors.Is(err, ErrNotPending):
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
	default:
		apierror.RespondInternal(c, err)
	}
}
