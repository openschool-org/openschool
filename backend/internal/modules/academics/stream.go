package academics

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/apierror"
	"github.com/openschool-org/openschool/internal/platform/httpx"
)

var (
	errStreamNotFound      = errors.New("stream not found")
	errStreamInUse         = errors.New("stream is assigned to classes and cannot be deleted")
	errStreamGroupNotFound = errors.New("stream group not found")
	errStreamGroupInUse    = errors.New("stream group is assigned to classes and cannot be deleted")
)

type Stream struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
}
type StreamGroup struct {
	ID        uuid.UUID `json:"id"`
	StreamID  uuid.UUID `json:"stream_id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
}
type streamCommand struct {
	Name string `json:"name" binding:"required"`
}

type streamStore interface {
	createStream(context.Context, string) (Stream, error)
	getStream(context.Context, uuid.UUID) (Stream, error)
	listStreams(context.Context) ([]Stream, error)
	updateStream(context.Context, uuid.UUID, string) (Stream, error)
	deleteStream(context.Context, uuid.UUID) (int64, error)
	createGroup(context.Context, uuid.UUID, string) (StreamGroup, error)
	getGroup(context.Context, uuid.UUID) (StreamGroup, error)
	listGroups(context.Context, uuid.UUID) ([]StreamGroup, error)
	updateGroup(context.Context, uuid.UUID, string) (StreamGroup, error)
	deleteGroup(context.Context, uuid.UUID) (int64, error)
}

type streamService struct{ streams streamStore }

func (s *streamService) deleteStream(ctx context.Context, id uuid.UUID) error {
	rows, err := s.streams.deleteStream(ctx, id)
	if err != nil {
		return err
	}
	if rows != 0 {
		return nil
	}
	if _, err := s.streams.getStream(ctx, id); err != nil {
		return errStreamNotFound
	}
	return errStreamInUse
}
func (s *streamService) deleteGroup(ctx context.Context, id uuid.UUID) error {
	rows, err := s.streams.deleteGroup(ctx, id)
	if err != nil {
		return err
	}
	if rows != 0 {
		return nil
	}
	if _, err := s.streams.getGroup(ctx, id); err != nil {
		return errStreamGroupNotFound
	}
	return errStreamGroupInUse
}

type streamHandler struct{ service *streamService }

func newStreamHandler(store streamStore) *streamHandler {
	return &streamHandler{service: &streamService{streams: store}}
}

func bindStream(c *gin.Context) (streamCommand, bool) {
	var command streamCommand
	if err := httpx.BindStrict(c, &command); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return command, false
	}
	return command, true
}
func (h *streamHandler) create(c *gin.Context) {
	command, ok := bindStream(c)
	if !ok {
		return
	}
	value, err := h.service.streams.createStream(c.Request.Context(), command.Name)
	respondWrite(c, http.StatusCreated, value, err)
}
func (h *streamHandler) get(c *gin.Context) {
	id, ok := httpx.ParamUUID(c, "id", "invalid id")
	if !ok {
		return
	}
	value, err := h.service.streams.getStream(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "stream not found"})
		return
	}
	c.JSON(http.StatusOK, value)
}
func (h *streamHandler) list(c *gin.Context) {
	values, err := h.service.streams.listStreams(c.Request.Context())
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, values)
}
func (h *streamHandler) update(c *gin.Context) {
	id, ok := httpx.ParamUUID(c, "id", "invalid id")
	if !ok {
		return
	}
	command, ok := bindStream(c)
	if !ok {
		return
	}
	value, err := h.service.streams.updateStream(c.Request.Context(), id, command.Name)
	respondWrite(c, http.StatusOK, value, err)
}
func (h *streamHandler) delete(c *gin.Context) {
	id, ok := httpx.ParamUUID(c, "id", "invalid id")
	if !ok {
		return
	}
	err := h.service.deleteStream(c.Request.Context(), id)
	respondDelete(c, err, errStreamNotFound, "stream deleted")
}
func (h *streamHandler) createGroup(c *gin.Context) {
	id, ok := httpx.ParamUUID(c, "id", "invalid stream id")
	if !ok {
		return
	}
	command, ok := bindStream(c)
	if !ok {
		return
	}
	value, err := h.service.streams.createGroup(c.Request.Context(), id, command.Name)
	respondWrite(c, http.StatusCreated, value, err)
}
func (h *streamHandler) listGroups(c *gin.Context) {
	id, ok := httpx.ParamUUID(c, "id", "invalid stream id")
	if !ok {
		return
	}
	values, err := h.service.streams.listGroups(c.Request.Context(), id)
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, values)
}
func (h *streamHandler) getGroup(c *gin.Context) {
	id, ok := httpx.ParamUUID(c, "groupId", "invalid group id")
	if !ok {
		return
	}
	value, err := h.service.streams.getGroup(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "stream group not found"})
		return
	}
	c.JSON(http.StatusOK, value)
}
func (h *streamHandler) updateGroup(c *gin.Context) {
	id, ok := httpx.ParamUUID(c, "groupId", "invalid group id")
	if !ok {
		return
	}
	command, ok := bindStream(c)
	if !ok {
		return
	}
	value, err := h.service.streams.updateGroup(c.Request.Context(), id, command.Name)
	respondWrite(c, http.StatusOK, value, err)
}
func (h *streamHandler) deleteGroup(c *gin.Context) {
	id, ok := httpx.ParamUUID(c, "groupId", "invalid group id")
	if !ok {
		return
	}
	err := h.service.deleteGroup(c.Request.Context(), id)
	respondDelete(c, err, errStreamGroupNotFound, "stream group deleted")
}
func respondWrite(c *gin.Context, status int, value any, err error) {
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(status, value)
}
func respondDelete(c *gin.Context, err, notFound error, message string) {
	if err != nil {
		if errors.Is(err, notFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": message})
}
