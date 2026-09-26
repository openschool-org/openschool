package workflows

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/openschool-org/openschool/internal/apierror"
	"github.com/openschool-org/openschool/internal/middleware"
)

type handler struct{ engine *Engine }

// RegisterRoutes mounts the admin-only workflow API.
func RegisterRoutes(admin *gin.RouterGroup, engine *Engine) {
	h := &handler{engine: engine}
	admin.GET("/workflows", h.catalog)
	admin.POST("/workflows/:key/check", h.check)
	admin.POST("/workflows/:key/runs", h.propose)
	admin.GET("/workflows/:key/runs", h.history)
	admin.GET("/workflow-runs/:id", h.get)
	admin.PATCH("/workflow-runs/:id/rows", h.edit)
	admin.POST("/workflow-runs/:id/apply", h.apply)
	admin.POST("/workflow-runs/:id/discard", h.discard)
	admin.POST("/workflow-runs/:id/revert", h.revert)
}

type inputsRequest struct {
	Inputs Inputs `json:"inputs"`
}

type editRequest struct {
	Section string            `json:"section" binding:"required"`
	RowID   string            `json:"row_id" binding:"required"`
	Cells   map[string]string `json:"cells" binding:"required"`
}

func (h *handler) respond(c *gin.Context, err error, checks []Check) bool {
	if err == nil {
		return false
	}
	switch {
	case errors.Is(err, ErrUnknownWorkflow), errors.Is(err, pgx.ErrNoRows):
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
	case errors.Is(err, ErrChecksFailed):
		c.JSON(http.StatusConflict, gin.H{"error": err.Error(), "checks": checks})
	case errors.Is(err, ErrNotProposed), errors.Is(err, ErrNotApplied), errors.Is(err, errYearInUse), errors.Is(err, errClassesInUse),
		errors.Is(err, errStudentsInUse), errors.Is(err, errChoicesInUse), errors.Is(err, errTimetablesInUse):
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
	case errors.Is(err, ErrNotEditable), errors.Is(err, ErrInvalidOption), errors.Is(err, ErrUnknownRow), errors.Is(err, ErrInvalidProposal):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	default:
		apierror.RespondInternal(c, err)
	}
	return true
}

func runID(c *gin.Context) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return uuid.Nil, false
	}
	return id, true
}

func actorID(c *gin.Context) (uuid.UUID, bool) {
	id, err := middleware.UserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return uuid.Nil, false
	}
	return id, true
}

func (h *handler) catalog(c *gin.Context) {
	out, err := h.engine.Catalog(c.Request.Context())
	if h.respond(c, err, nil) {
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *handler) check(c *gin.Context) {
	var req inputsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "inputs are required"})
		return
	}
	checks, err := h.engine.Check(c.Request.Context(), c.Param("key"), req.Inputs)
	if h.respond(c, err, nil) {
		return
	}
	c.JSON(http.StatusOK, gin.H{"checks": checks})
}

func (h *handler) propose(c *gin.Context) {
	actor, ok := actorID(c)
	if !ok {
		return
	}
	var req inputsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "inputs are required"})
		return
	}
	run, checks, err := h.engine.Propose(c.Request.Context(), c.Param("key"), req.Inputs, actor)
	if h.respond(c, err, checks) {
		return
	}
	c.JSON(http.StatusCreated, gin.H{"run": run, "checks": checks})
}

func (h *handler) history(c *gin.Context) {
	out, err := h.engine.History(c.Request.Context(), c.Param("key"))
	if h.respond(c, err, nil) {
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *handler) get(c *gin.Context) {
	id, ok := runID(c)
	if !ok {
		return
	}
	run, err := h.engine.Get(c.Request.Context(), id)
	if h.respond(c, err, nil) {
		return
	}
	c.JSON(http.StatusOK, run)
}

func (h *handler) edit(c *gin.Context) {
	id, ok := runID(c)
	if !ok {
		return
	}
	var req editRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "section, row_id and cells are required"})
		return
	}
	run, err := h.engine.Edit(c.Request.Context(), id, req.Section, req.RowID, req.Cells)
	if h.respond(c, err, nil) {
		return
	}
	c.JSON(http.StatusOK, run)
}

func (h *handler) apply(c *gin.Context) {
	id, ok := runID(c)
	if !ok {
		return
	}
	actor, ok := actorID(c)
	if !ok {
		return
	}
	run, checks, err := h.engine.Apply(c.Request.Context(), id, actor)
	if h.respond(c, err, checks) {
		return
	}
	c.JSON(http.StatusOK, run)
}

func (h *handler) discard(c *gin.Context) {
	id, ok := runID(c)
	if !ok {
		return
	}
	actor, ok := actorID(c)
	if !ok {
		return
	}
	if h.respond(c, h.engine.Discard(c.Request.Context(), id, actor), nil) {
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *handler) revert(c *gin.Context) {
	id, ok := runID(c)
	if !ok {
		return
	}
	actor, ok := actorID(c)
	if !ok {
		return
	}
	if h.respond(c, h.engine.Revert(c.Request.Context(), id, actor), nil) {
		return
	}
	c.Status(http.StatusNoContent)
}
