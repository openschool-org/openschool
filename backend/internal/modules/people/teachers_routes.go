package people

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/apierror"
	"github.com/openschool-org/openschool/internal/middleware"
	"github.com/openschool-org/openschool/internal/platform/httpx"
)

// TeacherListParams is the teachers-specific pagination request: the
// shared limit/offset/search contract plus the filters this list supports.
type TeacherListParams struct {
	httpx.PageParams
	Sort   httpx.SortParams
	Status string
}

type TeacherReader interface {
	Get(context.Context, uuid.UUID) (any, error)
	ListPage(context.Context, TeacherListParams) (any, error)
	Subjects(context.Context, uuid.UUID) (any, error)
	Workload(context.Context, uuid.UUID) (any, error)
	BySubject(context.Context, uuid.UUID) (any, error)
}

type TeacherWriter interface {
	Create(context.Context, CreateTeacherRequest, uuid.UUID) (any, error)
	Update(context.Context, uuid.UUID, UpdateTeacherRequest) (any, error)
	UpdateHouse(context.Context, uuid.UUID, UpdateTeacherHouseRequest, uuid.UUID) (any, error)
	UpdateStatus(context.Context, uuid.UUID, string) (any, error)
	Delete(context.Context, uuid.UUID, uuid.UUID) error
	AssignSubject(context.Context, uuid.UUID, AssignSubjectToTeacherRequest) error
	RemoveSubject(context.Context, uuid.UUID, uuid.UUID) error
}

func RegisterTeacherWriteRoutes(admin *gin.RouterGroup, writer TeacherWriter) {
	admin.POST("/teachers", func(c *gin.Context) {
		var req CreateTeacherRequest
		if err := httpx.BindStrict(c, &req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		actor, ok := teacherActor(c)
		if !ok {
			return
		}
		value, err := writer.Create(c, req, actor)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, value)
	})
	admin.PUT("/teachers/:id", func(c *gin.Context) {
		id, ok := teacherID(c)
		if !ok {
			return
		}
		var req UpdateTeacherRequest
		if err := httpx.BindStrict(c, &req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		value, err := writer.Update(c, id, req)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, value)
	})
	admin.PUT("/teachers/:id/house", func(c *gin.Context) {
		id, ok := teacherID(c)
		if !ok {
			return
		}
		var req UpdateTeacherHouseRequest
		if err := httpx.BindStrict(c, &req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		actor, ok := teacherActor(c)
		if !ok {
			return
		}
		value, err := writer.UpdateHouse(c, id, req, actor)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, value)
	})
	admin.PUT("/teachers/:id/employment-status", func(c *gin.Context) {
		id, ok := teacherID(c)
		if !ok {
			return
		}
		var req UpdateTeacherEmploymentStatusRequest
		if err := httpx.BindStrict(c, &req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		value, err := writer.UpdateStatus(c, id, req.Status)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, value)
	})
	admin.DELETE("/teachers/:id", func(c *gin.Context) {
		id, ok := teacherID(c)
		if !ok {
			return
		}
		actor, ok := teacherActor(c)
		if !ok {
			return
		}
		if err := writer.Delete(c, id, actor); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "teacher deleted"})
	})
	admin.POST("/teachers/:id/subjects", func(c *gin.Context) {
		id, ok := teacherID(c)
		if !ok {
			return
		}
		var req AssignSubjectToTeacherRequest
		if err := httpx.BindStrict(c, &req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := writer.AssignSubject(c, id, req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "subject assigned to teacher"})
	})
	admin.DELETE("/teachers/:id/subjects/:subject_id", func(c *gin.Context) {
		id, ok := teacherID(c)
		if !ok {
			return
		}
		subject, err := uuid.Parse(c.Param("subject_id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid subject id"})
			return
		}
		if err := writer.RemoveSubject(c, id, subject); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "subject removed from teacher"})
	})
}

func teacherActor(c *gin.Context) (uuid.UUID, bool) {
	id, err := middleware.UserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return uuid.Nil, false
	}
	return id, true
}

func RegisterTeacherReadRoutes(teacherOrAdmin, admin *gin.RouterGroup, reader TeacherReader) {
	teacherOrAdmin.GET("/teachers", func(c *gin.Context) {
		params := TeacherListParams{PageParams: httpx.ParsePage(c), Sort: httpx.ParseSort(c, "name", "employee", "joined", "status"), Status: c.Query("status")}
		value, err := reader.ListPage(c, params)
		readTeachers(c, value, err)
	})
	teacherOrAdmin.GET("/teachers/:id", func(c *gin.Context) {
		id, ok := teacherID(c)
		if ok {
			value, err := reader.Get(c, id)
			readTeachers(c, value, err)
		}
	})
	teacherOrAdmin.GET("/teachers/:id/subjects", func(c *gin.Context) {
		id, ok := teacherID(c)
		if ok {
			value, err := reader.Subjects(c, id)
			readTeachers(c, value, err)
		}
	})
	teacherOrAdmin.GET("/teachers/:id/workload", func(c *gin.Context) {
		id, ok := teacherID(c)
		if ok {
			value, err := reader.Workload(c, id)
			readTeachers(c, value, err)
		}
	})
	admin.GET("/subjects/:id/teachers", func(c *gin.Context) {
		id, ok := teacherID(c)
		if ok {
			value, err := reader.BySubject(c, id)
			readTeachers(c, value, err)
		}
	})
}

func teacherID(c *gin.Context) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return uuid.Nil, false
	}
	return id, true
}
func readTeachers(c *gin.Context, value any, err error) {
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, value)
}
