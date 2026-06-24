package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/services"
)

var _ db.Stream

type StreamHandler struct {
	service *services.StreamService
}

func NewStreamHandler(service *services.StreamService) *StreamHandler {
	return &StreamHandler{service: service}
}

// Create godoc
// @Summary      Create stream
// @Description  Create a new A/L stream (e.g. Science, Commerce, Arts)
// @Tags         streams
// @Accept       json
// @Produce      json
// @Param        request  body      models.CreateStreamRequest  true  "Stream info"
// @Success      201      {object}  db.Stream
// @Failure      400      {object}  map[string]string
// @Security     BearerAuth
// @Router       /streams [post]
func (h *StreamHandler) Create(c *gin.Context) {
	var req models.CreateStreamRequest
	if err := bindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	stream, err := h.service.CreateStream(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, stream)
}

// GetByID godoc
// @Summary      Get stream
// @Description  Retrieve a stream by ID
// @Tags         streams
// @Produce      json
// @Param        id   path      string  true  "Stream UUID"
// @Success      200  {object}  db.Stream
// @Failure      400  {object}  map[string]string
// @Failure      404  {object}  map[string]string
// @Security     BearerAuth
// @Router       /streams/{id} [get]
func (h *StreamHandler) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	stream, err := h.service.GetStream(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "stream not found"})
		return
	}

	c.JSON(http.StatusOK, stream)
}

// List godoc
// @Summary      List streams
// @Description  Retrieve all streams ordered by name
// @Tags         streams
// @Produce      json
// @Success      200  {array}   db.Stream
// @Failure      500  {object}  map[string]string
// @Security     BearerAuth
// @Router       /streams [get]
func (h *StreamHandler) List(c *gin.Context) {
	streams, err := h.service.ListStreams(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, streams)
}

// Update godoc
// @Summary      Update stream
// @Description  Update a stream's name by ID
// @Tags         streams
// @Accept       json
// @Produce      json
// @Param        id       path      string                      true  "Stream UUID"
// @Param        request  body      models.UpdateStreamRequest  true  "Stream info"
// @Success      200      {object}  db.Stream
// @Failure      400      {object}  map[string]string
// @Security     BearerAuth
// @Router       /streams/{id} [put]
func (h *StreamHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req models.UpdateStreamRequest
	if err := bindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	stream, err := h.service.UpdateStream(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stream)
}

// Delete godoc
// @Summary      Delete stream
// @Description  Delete a stream by ID; blocked if the stream is assigned to any class
// @Tags         streams
// @Produce      json
// @Param        id   path      string  true  "Stream UUID"
// @Success      200  {object}  map[string]string
// @Failure      400  {object}  map[string]string
// @Failure      404  {object}  map[string]string
// @Failure      409  {object}  map[string]string
// @Security     BearerAuth
// @Router       /streams/{id} [delete]
func (h *StreamHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	if err := h.service.DeleteStream(c.Request.Context(), id); err != nil {
		if errors.Is(err, services.ErrStreamNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "stream deleted"})
}

// CreateGroup godoc
// @Summary      Create stream group
// @Description  Create a sub-group under a stream (e.g. Bio, Maths under Science)
// @Tags         streams
// @Accept       json
// @Produce      json
// @Param        id       path      string                           true  "Stream UUID"
// @Param        request  body      models.CreateStreamGroupRequest  true  "Stream group info"
// @Success      201      {object}  db.StreamGroup
// @Failure      400      {object}  map[string]string
// @Security     BearerAuth
// @Router       /streams/{id}/groups [post]
func (h *StreamHandler) CreateGroup(c *gin.Context) {
	streamID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid stream id"})
		return
	}

	var req models.CreateStreamGroupRequest
	if err := bindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	group, err := h.service.CreateGroup(c.Request.Context(), streamID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, group)
}

// ListGroups godoc
// @Summary      List stream groups
// @Description  Retrieve all groups belonging to a stream
// @Tags         streams
// @Produce      json
// @Param        id   path      string  true  "Stream UUID"
// @Success      200  {array}   db.StreamGroup
// @Failure      400  {object}  map[string]string
// @Failure      500  {object}  map[string]string
// @Security     BearerAuth
// @Router       /streams/{id}/groups [get]
func (h *StreamHandler) ListGroups(c *gin.Context) {
	streamID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid stream id"})
		return
	}

	groups, err := h.service.ListGroups(c.Request.Context(), streamID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, groups)
}

// GetGroupByID godoc
// @Summary      Get stream group
// @Description  Retrieve a stream group by ID
// @Tags         streams
// @Produce      json
// @Param        id       path      string  true  "Stream UUID"
// @Param        groupId  path      string  true  "Stream group UUID"
// @Success      200      {object}  db.StreamGroup
// @Failure      400      {object}  map[string]string
// @Failure      404      {object}  map[string]string
// @Security     BearerAuth
// @Router       /streams/{id}/groups/{groupId} [get]
func (h *StreamHandler) GetGroupByID(c *gin.Context) {
	groupID, err := uuid.Parse(c.Param("groupId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid group id"})
		return
	}

	group, err := h.service.GetGroup(c.Request.Context(), groupID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "stream group not found"})
		return
	}

	c.JSON(http.StatusOK, group)
}

// UpdateGroup godoc
// @Summary      Update stream group
// @Description  Update a stream group's name by ID
// @Tags         streams
// @Accept       json
// @Produce      json
// @Param        id       path      string                           true  "Stream UUID"
// @Param        groupId  path      string                           true  "Stream group UUID"
// @Param        request  body      models.UpdateStreamGroupRequest  true  "Stream group info"
// @Success      200      {object}  db.StreamGroup
// @Failure      400      {object}  map[string]string
// @Security     BearerAuth
// @Router       /streams/{id}/groups/{groupId} [put]
func (h *StreamHandler) UpdateGroup(c *gin.Context) {
	groupID, err := uuid.Parse(c.Param("groupId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid group id"})
		return
	}

	var req models.UpdateStreamGroupRequest
	if err := bindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	group, err := h.service.UpdateGroup(c.Request.Context(), groupID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, group)
}

// DeleteGroup godoc
// @Summary      Delete stream group
// @Description  Delete a stream group by ID; blocked if the group is assigned to any class
// @Tags         streams
// @Produce      json
// @Param        id       path      string  true  "Stream UUID"
// @Param        groupId  path      string  true  "Stream group UUID"
// @Success      200      {object}  map[string]string
// @Failure      400      {object}  map[string]string
// @Failure      404      {object}  map[string]string
// @Failure      409      {object}  map[string]string
// @Security     BearerAuth
// @Router       /streams/{id}/groups/{groupId} [delete]
func (h *StreamHandler) DeleteGroup(c *gin.Context) {
	groupID, err := uuid.Parse(c.Param("groupId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid group id"})
		return
	}

	if err := h.service.DeleteGroup(c.Request.Context(), groupID); err != nil {
		if errors.Is(err, services.ErrStreamGroupNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "stream group deleted"})
}
