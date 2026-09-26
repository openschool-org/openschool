package people

import (
	"context"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/apierror"
	"github.com/openschool-org/openschool/internal/middleware"
	"github.com/openschool-org/openschool/internal/platform/httpx"
	"github.com/openschool-org/openschool/internal/ports"
)

type StudentRunner interface {
	Create(context.Context, CreateStudentRequest, uuid.UUID) (any, error)
	Update(context.Context, uuid.UUID, UpdateStudentRequest) (any, error)
	UpdateHouse(context.Context, uuid.UUID, UpdateStudentHouseRequest, uuid.UUID) (any, error)
	Delete(context.Context, uuid.UUID, uuid.UUID) error
	Erase(context.Context, uuid.UUID, uuid.UUID, string) error
}

// EraseStudentRequest requires a reason: an irreversible PII scrub (S11)
// must leave an audit trail explaining why, not just who did it.
type EraseStudentRequest struct {
	Reason string `json:"reason" binding:"required"`
}
type StudentStatusWriter interface {
	UpdateStatus(context.Context, uuid.UUID, string) (any, error)
}

// StudentListParams is the students-specific pagination request: the shared
// limit/offset/search contract (httpx.PageParams) plus the filters this
// list supports. Doesn't reference db/sqlc types — only repository.go may
// (internal/architecture enforces this) — so ListPage returns `any` and the
// concrete page type stays an implementation detail of the repository.
type StudentListParams struct {
	httpx.PageParams
	Sort                        httpx.SortParams
	Grade, Class, Gender, House string
}

type StudentReader interface {
	Get(context.Context, uuid.UUID) (any, error)
	GetWithClass(context.Context, uuid.UUID) (any, error)
	ListPage(context.Context, StudentListParams) (any, error)
	ListByClass(context.Context, uuid.UUID) (any, error)
}

func RegisterStudentRoutes(admin, teacherOrAdmin *gin.RouterGroup, runner StudentRunner, reader StudentReader, statusWriter StudentStatusWriter, audit ports.AuditRecorder) {
	admin.POST("/students", func(c *gin.Context) {
		var r CreateStudentRequest
		if e := httpx.BindStrict(c, &r); e != nil {
			c.JSON(400, gin.H{"error": e.Error()})
			return
		}
		a, ok := studentActor(c)
		if !ok {
			return
		}
		v, e := runner.Create(c, r, a)
		if e != nil {
			c.JSON(400, gin.H{"error": e.Error()})
			return
		}
		c.JSON(201, v)
	})
	teacherOrAdmin.GET("/students", func(c *gin.Context) {
		params := StudentListParams{
			PageParams: httpx.ParsePage(c),
			Sort:       httpx.ParseSort(c, "name", "index", "grade", "class", "house"),
			Grade:      c.Query("grade"), Class: c.Query("class"), Gender: c.Query("gender"), House: c.Query("house"),
		}
		v, e := reader.ListPage(c, params)
		if e != nil {
			apierror.RespondInternal(c, e)
			return
		}
		c.JSON(200, v)
	})
	teacherOrAdmin.GET("/students/:id", func(c *gin.Context) {
		id, ok := studentID(c)
		if !ok {
			return
		}
		v, e := reader.Get(c, id)
		if e != nil {
			c.JSON(404, gin.H{"error": "student not found"})
			return
		}
		auditStudentProfileRead(c, audit, id)
		c.JSON(200, v)
	})
	teacherOrAdmin.GET("/students/:id/class", func(c *gin.Context) {
		id, ok := studentID(c)
		if !ok {
			return
		}
		v, e := reader.GetWithClass(c, id)
		if e != nil {
			c.JSON(404, gin.H{"error": "student not found"})
			return
		}
		auditStudentProfileRead(c, audit, id)
		c.JSON(200, v)
	})
	admin.PUT("/students/:id", func(c *gin.Context) {
		id, ok := studentID(c)
		if !ok {
			return
		}
		var r UpdateStudentRequest
		if e := httpx.BindStrict(c, &r); e != nil {
			c.JSON(400, gin.H{"error": e.Error()})
			return
		}
		v, e := runner.Update(c, id, r)
		if e != nil {
			c.JSON(400, gin.H{"error": e.Error()})
			return
		}
		c.JSON(200, v)
	})
	admin.PUT("/students/:id/house", func(c *gin.Context) {
		id, ok := studentID(c)
		if !ok {
			return
		}
		var r UpdateStudentHouseRequest
		if e := httpx.BindStrict(c, &r); e != nil {
			c.JSON(400, gin.H{"error": e.Error()})
			return
		}
		a, ok := studentActor(c)
		if !ok {
			return
		}
		v, e := runner.UpdateHouse(c, id, r, a)
		if e != nil {
			c.JSON(400, gin.H{"error": e.Error()})
			return
		}
		c.JSON(200, v)
	})
	admin.PUT("/students/:id/enrollment-status", func(c *gin.Context) {
		id, ok := studentID(c)
		if !ok {
			return
		}
		var r UpdateStudentEnrollmentStatusRequest
		if e := httpx.BindStrict(c, &r); e != nil {
			c.JSON(400, gin.H{"error": e.Error()})
			return
		}
		v, e := statusWriter.UpdateStatus(c, id, r.Status)
		if e != nil {
			c.JSON(400, gin.H{"error": e.Error()})
			return
		}
		c.JSON(200, v)
	})
	admin.DELETE("/students/:id", func(c *gin.Context) {
		id, ok := studentID(c)
		if !ok {
			return
		}
		a, ok := studentActor(c)
		if !ok {
			return
		}
		if e := runner.Delete(c, id, a); e != nil {
			c.JSON(400, gin.H{"error": e.Error()})
			return
		}
		c.JSON(200, gin.H{"message": "student deleted"})
	})
	admin.POST("/students/:id/erase", func(c *gin.Context) {
		id, ok := studentID(c)
		if !ok {
			return
		}
		var r EraseStudentRequest
		if e := httpx.BindStrict(c, &r); e != nil {
			c.JSON(400, gin.H{"error": e.Error()})
			return
		}
		a, ok := studentActor(c)
		if !ok {
			return
		}
		if e := runner.Erase(c, id, a, r.Reason); e != nil {
			if errors.Is(e, ErrStudentNotFound) {
				c.JSON(404, gin.H{"error": e.Error()})
				return
			}
			// Anything else is a wrapped database error (e.g. from
			// AnonymizeProfile) and must not be echoed to the client (S4).
			apierror.RespondInternal(c, e)
			return
		}
		c.JSON(200, gin.H{"message": "student profile erased"})
	})
	teacherOrAdmin.GET("/classes/:id/students", func(c *gin.Context) {
		id, ok := studentID(c)
		if !ok {
			return
		}
		v, e := reader.ListByClass(c, id)
		if e != nil {
			c.JSON(500, gin.H{"error": e.Error()})
			return
		}
		c.JSON(200, v)
	})
}
// auditStudentProfileRead logs a read of a student's profile, best-effort:
// PDPA requires an access log for reads of student data (S11), but a
// logging failure must never fail the read itself.
func auditStudentProfileRead(c *gin.Context, audit ports.AuditRecorder, studentID uuid.UUID) {
	if audit == nil {
		return
	}
	actor, err := middleware.UserIDFromContext(c)
	if err != nil {
		return
	}
	_ = audit.Record(c.Request.Context(), "student_profile", studentID, "viewed", actor, nil, nil, "")
}

func studentID(c *gin.Context) (uuid.UUID, bool) {
	id, e := uuid.Parse(c.Param("id"))
	if e != nil {
		c.JSON(400, gin.H{"error": "invalid id"})
		return uuid.Nil, false
	}
	return id, true
}
func studentActor(c *gin.Context) (uuid.UUID, bool) {
	id, e := middleware.UserIDFromContext(c)
	if e != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return uuid.Nil, false
	}
	return id, true
}
