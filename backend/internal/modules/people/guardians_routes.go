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
)

// GuardianListParams is the guardians-specific pagination request: the
// shared limit/offset/search contract plus the orphans-only filter.
type GuardianListParams struct {
	httpx.PageParams
	Sort        httpx.SortParams
	OrphansOnly bool
}

type GuardianReader interface {
	Get(context.Context, uuid.UUID) (any, error)
	ListPage(context.Context, GuardianListParams) (any, error)
	Students(context.Context, uuid.UUID) (any, error)
	ByStudent(context.Context, uuid.UUID) (any, error)
}

type GuardianWriter interface {
	Create(context.Context, CreateGuardianRequest) (any, any, error)
	Update(context.Context, uuid.UUID, UpdateGuardianRequest) (any, error)
	Delete(context.Context, uuid.UUID, uuid.UUID) error
	Link(context.Context, uuid.UUID, LinkGuardianRequest) error
	Unlink(context.Context, uuid.UUID, uuid.UUID) error
	SetPrimary(context.Context, uuid.UUID, uuid.UUID) error
	Provision(context.Context, uuid.UUID, ProvisionGuardianLoginRequest, uuid.UUID) (any, error)
}

type GuardianNotificationReader interface {
	Notifications(context.Context, uuid.UUID) (any, error)
}

func RegisterGuardianNotificationRoute(admin *gin.RouterGroup, reader GuardianNotificationReader) {
	admin.GET("/guardians/:id/notifications", func(c *gin.Context) {
		id, ok := guardianID(c)
		if !ok {
			return
		}
		value, err := reader.Notifications(c, id)
		readGuardians(c, value, err)
	})
}

type guardianWriteHandler struct{ writer GuardianWriter }

func RegisterGuardianWriteRoutes(admin *gin.RouterGroup, writer GuardianWriter) {
	h := &guardianWriteHandler{writer: writer}
	admin.POST("/guardians", h.createGuardian)
	admin.PUT("/guardians/:id", h.updateGuardian)
	admin.DELETE("/guardians/:id", h.deleteGuardian)
	admin.POST("/students/:id/guardians", h.linkGuardian)
	admin.DELETE("/students/:id/guardians/:guardian_id", h.unlinkGuardian)
	admin.PUT("/students/:id/guardians/:guardian_id/set-primary", h.setPrimaryGuardian)
	admin.POST("/guardians/:id/provision-login", h.provisionGuardianLogin)
}

func (h *guardianWriteHandler) createGuardian(c *gin.Context) {
	var req CreateGuardianRequest
	if err := httpx.BindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	guardian, duplicates, err := h.writer.Create(c, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"guardian": guardian, "possible_duplicates": duplicates})
}

func (h *guardianWriteHandler) updateGuardian(c *gin.Context) {
	id, ok := guardianID(c)
	if !ok {
		return
	}
	var req UpdateGuardianRequest
	if err := httpx.BindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	value, err := h.writer.Update(c, id, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, value)
}

func (h *guardianWriteHandler) deleteGuardian(c *gin.Context) {
	id, ok := guardianID(c)
	if !ok {
		return
	}
	actor, ok := guardianActor(c)
	if !ok {
		return
	}
	if err := h.writer.Delete(c, id, actor); err != nil {
		guardianWriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "guardian deleted"})
}

func (h *guardianWriteHandler) linkGuardian(c *gin.Context) {
	student, ok := guardianID(c)
	if !ok {
		return
	}
	var req LinkGuardianRequest
	if err := httpx.BindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.writer.Link(c, student, req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "guardian linked to student"})
}

func (h *guardianWriteHandler) unlinkGuardian(c *gin.Context) {
	student, ok := guardianID(c)
	if !ok {
		return
	}
	guardian, err := uuid.Parse(c.Param("guardian_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid guardian id"})
		return
	}
	if err := h.writer.Unlink(c, student, guardian); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "guardian unlinked from student"})
}

func (h *guardianWriteHandler) setPrimaryGuardian(c *gin.Context) {
	student, ok := guardianID(c)
	if !ok {
		return
	}
	guardian, err := uuid.Parse(c.Param("guardian_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid guardian id"})
		return
	}
	if err := h.writer.SetPrimary(c, student, guardian); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "primary contact updated"})
}

func (h *guardianWriteHandler) provisionGuardianLogin(c *gin.Context) {
	id, ok := guardianID(c)
	if !ok {
		return
	}
	var req ProvisionGuardianLoginRequest
	if err := httpx.BindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	actor, ok := guardianActor(c)
	if !ok {
		return
	}
	value, err := h.writer.Provision(c, id, req, actor)
	if err != nil {
		guardianWriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, value)
}

func guardianWriteError(c *gin.Context, err error) {
	status := http.StatusBadRequest
	if errors.Is(err, ErrGuardianNotFound) {
		status = http.StatusNotFound
	} else if errors.Is(err, ErrGuardianInUse) || errors.Is(err, ErrGuardianAlreadyProvisioned) || errors.Is(err, ErrGuardianMissingEmail) || errors.Is(err, ErrGuardianMissingNIC) {
		status = http.StatusConflict
	}
	c.JSON(status, gin.H{"error": err.Error()})
}

func guardianActor(c *gin.Context) (uuid.UUID, bool) {
	id, err := middleware.UserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return uuid.Nil, false
	}
	return id, true
}

func RegisterGuardianReadRoutes(teacherOrAdmin, studentAccess *gin.RouterGroup, reader GuardianReader) {
	teacherOrAdmin.GET("/guardians", func(c *gin.Context) {
		params := GuardianListParams{PageParams: httpx.ParsePage(c), Sort: httpx.ParseSort(c, "name", "relationship"), OrphansOnly: c.Query("orphans") == "true"}
		value, err := reader.ListPage(c, params)
		readGuardians(c, hideNIC(c, value), err)
	})
	teacherOrAdmin.GET("/guardians/:id", func(c *gin.Context) {
		id, ok := guardianID(c)
		if !ok {
			return
		}
		value, err := reader.Get(c, id)
		readGuardians(c, hideNIC(c, value), err)
	})
	teacherOrAdmin.GET("/guardians/:id/students", func(c *gin.Context) {
		id, ok := guardianID(c)
		if !ok {
			return
		}
		value, err := reader.Students(c, id)
		readGuardians(c, value, err)
	})
	studentAccess.GET("/students/:id/guardians", func(c *gin.Context) {
		id, ok := guardianID(c)
		if !ok {
			return
		}
		value, err := reader.ByStudent(c, id)
		readGuardians(c, hideNIC(c, value), err)
	})
}
func guardianID(c *gin.Context) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return uuid.Nil, false
	}
	return id, true
}
func readGuardians(c *gin.Context, value any, err error) {
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, value)
}
