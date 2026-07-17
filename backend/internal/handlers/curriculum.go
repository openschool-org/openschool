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

type CurriculumHandler struct {
	service *services.CurriculumService
}

func NewCurriculumHandler(service *services.CurriculumService) *CurriculumHandler {
	return &CurriculumHandler{service: service}
}

func toMediumResponse(m db.Medium) models.MediumResponse {
	return models.MediumResponse{
		ID:        m.ID.String(),
		Name:      m.Name,
		CreatedAt: m.CreatedAt.Time.String(),
	}
}

func toSelectionGroupResponse(g db.SelectionGroup) models.SelectionGroupResponse {
	return models.SelectionGroupResponse{
		ID:        g.ID.String(),
		LevelID:   g.LevelID.String(),
		Label:     g.Label,
		MinSelect: g.MinSelect,
		MaxSelect: g.MaxSelect,
		SortOrder: g.SortOrder,
		CreatedAt: g.CreatedAt.Time.String(),
	}
}

// ── mediums ─────────────────────────────────────────────────────────────────

// CreateMedium godoc
// @Summary      Create medium
// @Description  Create a school-defined medium of instruction
// @Tags         curriculum
// @Accept       json
// @Produce      json
// @Param        request  body      models.CreateMediumRequest  true  "Medium info"
// @Success      201      {object}  models.MediumResponse
// @Failure      400      {object}  map[string]string
// @Security     BearerAuth
// @Router       /mediums [post]
func (h *CurriculumHandler) CreateMedium(c *gin.Context) {
	var req models.CreateMediumRequest
	if err := bindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	medium, err := h.service.CreateMedium(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, toMediumResponse(medium))
}

// ListMediums godoc
// @Summary      List mediums
// @Tags         curriculum
// @Produce      json
// @Success      200  {array}   models.MediumResponse
// @Failure      500  {object}  map[string]string
// @Security     BearerAuth
// @Router       /mediums [get]
func (h *CurriculumHandler) ListMediums(c *gin.Context) {
	mediums, err := h.service.ListMediums(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	resp := make([]models.MediumResponse, len(mediums))
	for i, m := range mediums {
		resp[i] = toMediumResponse(m)
	}

	c.JSON(http.StatusOK, resp)
}

// UpdateMedium godoc
// @Summary      Update medium
// @Tags         curriculum
// @Accept       json
// @Produce      json
// @Param        id       path      string                      true  "Medium UUID"
// @Param        request  body      models.UpdateMediumRequest  true  "Medium info"
// @Success      200      {object}  models.MediumResponse
// @Failure      400      {object}  map[string]string
// @Security     BearerAuth
// @Router       /mediums/{id} [put]
func (h *CurriculumHandler) UpdateMedium(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req models.UpdateMediumRequest
	if err := bindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	medium, err := h.service.UpdateMedium(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, toMediumResponse(medium))
}

// DeleteMedium godoc
// @Summary      Delete medium
// @Description  Blocked while the medium is referenced by a group subject or enrollment
// @Tags         curriculum
// @Produce      json
// @Param        id   path      string  true  "Medium UUID"
// @Success      200  {object}  map[string]string
// @Failure      404  {object}  map[string]string
// @Failure      409  {object}  map[string]string
// @Security     BearerAuth
// @Router       /mediums/{id} [delete]
func (h *CurriculumHandler) DeleteMedium(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	if err := h.service.DeleteMedium(c.Request.Context(), id); err != nil {
		if errors.Is(err, services.ErrMediumNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "medium deleted"})
}

// ── levels ──────────────────────────────────────────────────────────────────

// CreateLevel godoc
// @Summary      Create level
// @Description  Create an admin-defined curriculum level
// @Tags         curriculum
// @Accept       json
// @Produce      json
// @Param        request  body      models.CreateLevelRequest  true  "Level info"
// @Success      201      {object}  models.LevelResponse
// @Failure      400      {object}  map[string]string
// @Security     BearerAuth
// @Router       /levels [post]
func (h *CurriculumHandler) CreateLevel(c *gin.Context) {
	var req models.CreateLevelRequest
	if err := bindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	level, err := h.service.CreateLevel(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, services.ToLevelResponse(level))
}

// GetLevel godoc
// @Summary      Get level
// @Tags         curriculum
// @Produce      json
// @Param        id   path      string  true  "Level UUID"
// @Success      200  {object}  models.LevelResponse
// @Failure      404  {object}  map[string]string
// @Security     BearerAuth
// @Router       /levels/{id} [get]
func (h *CurriculumHandler) GetLevel(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	level, err := h.service.GetLevel(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "level not found"})
		return
	}

	c.JSON(http.StatusOK, services.ToLevelResponse(level))
}

// ListLevels godoc
// @Summary      List levels
// @Description  Optionally filtered by grade via ?grade_id=
// @Tags         curriculum
// @Produce      json
// @Param        grade_id  query     string  false  "Grade UUID"
// @Success      200       {array}   models.LevelResponse
// @Failure      500       {object}  map[string]string
// @Security     BearerAuth
// @Router       /levels [get]
func (h *CurriculumHandler) ListLevels(c *gin.Context) {
	var (
		levels []db.Level
		err    error
	)

	if gradeParam := c.Query("grade_id"); gradeParam != "" {
		gradeID, parseErr := uuid.Parse(gradeParam)
		if parseErr != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid grade_id"})
			return
		}
		levels, err = h.service.ListLevelsByGrade(c.Request.Context(), gradeID)
	} else {
		levels, err = h.service.ListLevels(c.Request.Context())
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	resp := make([]models.LevelResponse, len(levels))
	for i, l := range levels {
		resp[i] = services.ToLevelResponse(l)
	}

	c.JSON(http.StatusOK, resp)
}

// UpdateLevel godoc
// @Summary      Update level
// @Tags         curriculum
// @Accept       json
// @Produce      json
// @Param        id       path      string                     true  "Level UUID"
// @Param        request  body      models.UpdateLevelRequest  true  "Level info"
// @Success      200      {object}  models.LevelResponse
// @Failure      400      {object}  map[string]string
// @Security     BearerAuth
// @Router       /levels/{id} [put]
func (h *CurriculumHandler) UpdateLevel(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req models.UpdateLevelRequest
	if err := bindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	level, err := h.service.UpdateLevel(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, services.ToLevelResponse(level))
}

// DuplicateLevel godoc
// @Summary      Duplicate level
// @Description  Copy a level with all its selection groups and their subjects, under a new label
// @Tags         curriculum
// @Accept       json
// @Produce      json
// @Param        id       path      string                        true  "Source level UUID"
// @Param        request  body      models.DuplicateLevelRequest  true  "New level info"
// @Success      201      {object}  models.LevelResponse
// @Failure      400      {object}  map[string]string
// @Failure      404      {object}  map[string]string
// @Security     BearerAuth
// @Router       /levels/{id}/duplicate [post]
func (h *CurriculumHandler) DuplicateLevel(c *gin.Context) {
	sourceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req models.DuplicateLevelRequest
	if err := bindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	level, err := h.service.DuplicateLevel(c.Request.Context(), sourceID, req)
	if err != nil {
		if errors.Is(err, services.ErrLevelNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, services.ToLevelResponse(level))
}

// DeleteLevel godoc
// @Summary      Delete level
// @Description  Blocked while any of the level's groups still carry enrollments
// @Tags         curriculum
// @Produce      json
// @Param        id   path      string  true  "Level UUID"
// @Success      200  {object}  map[string]string
// @Failure      404  {object}  map[string]string
// @Failure      409  {object}  map[string]string
// @Security     BearerAuth
// @Router       /levels/{id} [delete]
func (h *CurriculumHandler) DeleteLevel(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	if err := h.service.DeleteLevel(c.Request.Context(), id); err != nil {
		if errors.Is(err, services.ErrLevelNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "level deleted"})
}

// GetCurriculumTree godoc
// @Summary      Get curriculum tree
// @Description  A level with its selection groups and each group's subjects nested
// @Tags         curriculum
// @Produce      json
// @Param        id   path      string  true  "Level UUID"
// @Success      200  {object}  models.CurriculumTreeResponse
// @Failure      404  {object}  map[string]string
// @Security     BearerAuth
// @Router       /levels/{id}/tree [get]
func (h *CurriculumHandler) GetCurriculumTree(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	tree, err := h.service.GetCurriculumTree(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, services.ErrLevelNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, tree)
}

// ── selection groups ────────────────────────────────────────────────────────

// CreateSelectionGroup godoc
// @Summary      Create selection group
// @Description  A pool the student picks between min_select and max_select subjects from
// @Tags         curriculum
// @Accept       json
// @Produce      json
// @Param        id       path      string                              true  "Level UUID"
// @Param        request  body      models.CreateSelectionGroupRequest  true  "Group info"
// @Success      201      {object}  models.SelectionGroupResponse
// @Failure      400      {object}  map[string]string
// @Security     BearerAuth
// @Router       /levels/{id}/groups [post]
func (h *CurriculumHandler) CreateSelectionGroup(c *gin.Context) {
	levelID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid level id"})
		return
	}

	var req models.CreateSelectionGroupRequest
	if err := bindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	group, err := h.service.CreateSelectionGroup(c.Request.Context(), levelID, req)
	if err != nil {
		if errors.Is(err, services.ErrLevelNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, toSelectionGroupResponse(group))
}

// ListSelectionGroups godoc
// @Summary      List selection groups of a level
// @Tags         curriculum
// @Produce      json
// @Param        id   path      string  true  "Level UUID"
// @Success      200  {array}   models.SelectionGroupResponse
// @Failure      500  {object}  map[string]string
// @Security     BearerAuth
// @Router       /levels/{id}/groups [get]
func (h *CurriculumHandler) ListSelectionGroups(c *gin.Context) {
	levelID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid level id"})
		return
	}

	groups, err := h.service.ListSelectionGroupsByLevel(c.Request.Context(), levelID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	resp := make([]models.SelectionGroupResponse, len(groups))
	for i, g := range groups {
		resp[i] = toSelectionGroupResponse(g)
	}

	c.JSON(http.StatusOK, resp)
}

// UpdateSelectionGroup godoc
// @Summary      Update selection group
// @Tags         curriculum
// @Accept       json
// @Produce      json
// @Param        group_id  path      string                              true  "Group UUID"
// @Param        request   body      models.UpdateSelectionGroupRequest  true  "Group info"
// @Success      200       {object}  models.SelectionGroupResponse
// @Failure      400       {object}  map[string]string
// @Security     BearerAuth
// @Router       /groups/{group_id} [put]
func (h *CurriculumHandler) UpdateSelectionGroup(c *gin.Context) {
	id, err := uuid.Parse(c.Param("group_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid group id"})
		return
	}

	var req models.UpdateSelectionGroupRequest
	if err := bindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	group, err := h.service.UpdateSelectionGroup(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, toSelectionGroupResponse(group))
}

// DeleteSelectionGroup godoc
// @Summary      Delete selection group
// @Description  Blocked while enrollments reference the group
// @Tags         curriculum
// @Produce      json
// @Param        group_id  path      string  true  "Group UUID"
// @Success      200       {object}  map[string]string
// @Failure      404       {object}  map[string]string
// @Failure      409       {object}  map[string]string
// @Security     BearerAuth
// @Router       /groups/{group_id} [delete]
func (h *CurriculumHandler) DeleteSelectionGroup(c *gin.Context) {
	id, err := uuid.Parse(c.Param("group_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid group id"})
		return
	}

	if err := h.service.DeleteSelectionGroup(c.Request.Context(), id); err != nil {
		if errors.Is(err, services.ErrSelectionGroupNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "selection group deleted"})
}

// ── group subjects ──────────────────────────────────────────────────────────

// AddGroupSubject godoc
// @Summary      Add subject to group
// @Description  Upserts the subject's medium restriction and prerequisite note
// @Tags         curriculum
// @Accept       json
// @Produce      json
// @Param        group_id  path      string                         true  "Group UUID"
// @Param        request   body      models.AddGroupSubjectRequest  true  "Group subject info"
// @Success      201       {object}  map[string]string
// @Failure      400       {object}  map[string]string
// @Security     BearerAuth
// @Router       /groups/{group_id}/subjects [post]
func (h *CurriculumHandler) AddGroupSubject(c *gin.Context) {
	groupID, err := uuid.Parse(c.Param("group_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid group id"})
		return
	}

	var req models.AddGroupSubjectRequest
	if err := bindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if _, err := h.service.AddGroupSubject(c.Request.Context(), groupID, req); err != nil {
		if errors.Is(err, services.ErrSelectionGroupNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "subject added to group"})
}

// ListGroupSubjects godoc
// @Summary      List a group's subjects
// @Tags         curriculum
// @Produce      json
// @Param        group_id  path      string  true  "Group UUID"
// @Success      200       {array}   models.GroupSubjectResponse
// @Failure      500       {object}  map[string]string
// @Security     BearerAuth
// @Router       /groups/{group_id}/subjects [get]
func (h *CurriculumHandler) ListGroupSubjects(c *gin.Context) {
	groupID, err := uuid.Parse(c.Param("group_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid group id"})
		return
	}

	subjects, err := h.service.ListGroupSubjects(c.Request.Context(), groupID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, subjects)
}

// RemoveGroupSubject godoc
// @Summary      Remove subject from group
// @Tags         curriculum
// @Produce      json
// @Param        group_id    path      string  true  "Group UUID"
// @Param        subject_id  path      string  true  "Subject UUID"
// @Success      200         {object}  map[string]string
// @Failure      400         {object}  map[string]string
// @Security     BearerAuth
// @Router       /groups/{group_id}/subjects/{subject_id} [delete]
func (h *CurriculumHandler) RemoveGroupSubject(c *gin.Context) {
	groupID, err := uuid.Parse(c.Param("group_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid group id"})
		return
	}

	subjectID, err := uuid.Parse(c.Param("subject_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid subject id"})
		return
	}

	if err := h.service.RemoveGroupSubject(c.Request.Context(), groupID, subjectID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "subject removed from group"})
}
