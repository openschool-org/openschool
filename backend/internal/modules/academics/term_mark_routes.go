package academics

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/apierror"
	"github.com/openschool-org/openschool/internal/authz"
	"github.com/openschool-org/openschool/internal/middleware"
	"github.com/openschool-org/openschool/internal/platform/httpx"
)

type TermMarkActor struct {
	ID   uuid.UUID
	Role string
}
type TermMarkReader interface {
	ListStudentMarks(context.Context, uuid.UUID, uuid.UUID) (any, error)
}
type TermMarkRunner interface {
	TermMarkReader
	BulkUpsertMarks(context.Context, uuid.UUID, TermMarkActor, BulkUpsertMarksRequest) (any, error)
	ListClassMarks(context.Context, TermMarkActor, uuid.UUID, uuid.UUID, uuid.UUID) (any, error)
	ListStudentMarksForTeacher(context.Context, TermMarkActor, uuid.UUID, uuid.UUID) (any, error)
	DeleteMark(context.Context, TermMarkActor, uuid.UUID) error
}

func RegisterTermMarkRoutes(teacherOrAdmin *gin.RouterGroup, runner TermMarkRunner) {
	teacherOrAdmin.PUT("/classes/:id/marks", func(c *gin.Context) {
		classID, ok := termMarkID(c, "id", "invalid id")
		if !ok {
			return
		}
		var request BulkUpsertMarksRequest
		if err := httpx.BindStrict(c, &request); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		actor, ok := termMarkActor(c)
		if !ok {
			return
		}
		marks, err := runner.BulkUpsertMarks(c.Request.Context(), classID, actor, request)
		if err != nil {
			respondTermMarkError(c, err)
			return
		}
		c.JSON(http.StatusOK, marks)
	})
	teacherOrAdmin.GET("/classes/:id/marks", func(c *gin.Context) {
		classID, ok := termMarkID(c, "id", "invalid id")
		if !ok {
			return
		}
		term, ok := termMarkQueryID(c, "term_id")
		if !ok {
			return
		}
		subject, ok := termMarkQueryID(c, "subject_id")
		if !ok {
			return
		}
		actor, ok := termMarkActor(c)
		if !ok {
			return
		}
		rows, err := runner.ListClassMarks(c, actor, classID, term, subject)
		if err != nil {
			apierror.RespondInternal(c, err)
			return
		}
		c.JSON(http.StatusOK, rows)
	})
	teacherOrAdmin.GET("/students/:id/marks", func(c *gin.Context) {
		student, ok := termMarkID(c, "id", "invalid id")
		if !ok {
			return
		}
		term, ok := termMarkQueryID(c, "term_id")
		if !ok {
			return
		}
		actor, ok := termMarkActor(c)
		if !ok {
			return
		}
		rows, err := runner.ListStudentMarksForTeacher(c, actor, student, term)
		if err != nil {
			apierror.RespondInternal(c, err)
			return
		}
		c.JSON(http.StatusOK, rows)
	})
	teacherOrAdmin.DELETE("/marks/:id", func(c *gin.Context) {
		id, ok := termMarkID(c, "id", "invalid id")
		if !ok {
			return
		}
		actor, ok := termMarkActor(c)
		if !ok {
			return
		}
		if err := runner.DeleteMark(c, actor, id); err != nil {
			respondTermMarkError(c, err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "mark deleted"})
	})
}

// respondTermMarkError keeps permission and term errors as 4xx and hides database detail.
func respondTermMarkError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrNotAssignedToSubject):
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
	case errors.Is(err, ErrTermOutsideClassYear):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	case err.Error() == "mark not found":
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
	default:
		apierror.Respond(c, err)
	}
}

func termMarkID(c *gin.Context, name, message string) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Param(name))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": message})
		return uuid.Nil, false
	}
	return id, true
}
func termMarkQueryID(c *gin.Context, name string) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Query(name))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid or missing " + name})
		return uuid.Nil, false
	}
	return id, true
}
func termMarkActor(c *gin.Context) (TermMarkActor, bool) {
	id, err := middleware.UserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": fmt.Errorf("invalid caller identity").Error()})
		return TermMarkActor{}, false
	}
	roles, _ := c.Get("roles")
	roleList, _ := roles.([]string)
	return TermMarkActor{ID: id, Role: authz.ResolveAppRole(roleList)}, true
}
