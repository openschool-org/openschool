package curriculum

import (
	"context"
	"errors"
	"github.com/openschool-org/openschool/internal/apierror"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/platform/httpx"
)

var (
	errLevelNotFound      = errors.New("level not found")
	errLevelInUse         = errors.New("level has enrolled students and cannot be deleted")
	errGroupNotFound      = errors.New("selection group not found")
	errGroupInUse         = errors.New("selection group has enrolled students and cannot be deleted")
	errInvalidSelectRange = errors.New("max_select must be greater than or equal to min_select")
)

type Level struct {
	ID        string  `json:"id"`
	Label     string  `json:"label"`
	GradeID   *string `json:"grade_id"`
	SortOrder int32   `json:"sort_order"`
	CreatedAt string  `json:"created_at"`
}
type SelectionGroup struct {
	ID        string `json:"id"`
	LevelID   string `json:"level_id"`
	Label     string `json:"label"`
	MinSelect int32  `json:"min_select"`
	MaxSelect int32  `json:"max_select"`
	SortOrder int32  `json:"sort_order"`
	CreatedAt string `json:"created_at"`
}
type GroupSubject struct {
	SubjectID        string  `json:"subject_id"`
	SubjectName      string  `json:"subject_name"`
	SubjectCode      string  `json:"subject_code"`
	SubjectType      *string `json:"subject_type"`
	MediumID         *string `json:"medium_id"`
	MediumName       *string `json:"medium_name"`
	PrerequisiteNote *string `json:"prerequisite_note"`
	SortOrder        int32   `json:"sort_order"`
}
type CurriculumGroup struct {
	ID        string         `json:"id"`
	Label     string         `json:"label"`
	MinSelect int32          `json:"min_select"`
	MaxSelect int32          `json:"max_select"`
	SortOrder int32          `json:"sort_order"`
	Subjects  []GroupSubject `json:"subjects"`
}
type CurriculumTree struct {
	Level  Level             `json:"level"`
	Groups []CurriculumGroup `json:"groups"`
}

type levelRequest struct {
	Label     string `json:"label" binding:"required"`
	GradeID   string `json:"grade_id"`
	SortOrder int32  `json:"sort_order"`
}
type groupRequest struct {
	Label     string `json:"label" binding:"required"`
	MinSelect int32  `json:"min_select" binding:"gte=0"`
	MaxSelect int32  `json:"max_select" binding:"gte=0"`
	SortOrder int32  `json:"sort_order"`
}
type groupSubjectRequest struct {
	SubjectID        string `json:"subject_id" binding:"required"`
	MediumID         string `json:"medium_id"`
	PrerequisiteNote string `json:"prerequisite_note"`
	SortOrder        int32  `json:"sort_order"`
}

type levelStore interface {
	createLevel(context.Context, levelRequest) (Level, error)
	getLevel(context.Context, uuid.UUID) (Level, error)
	listLevels(context.Context) ([]Level, error)
	listLevelsByGrade(context.Context, uuid.UUID) ([]Level, error)
	updateLevel(context.Context, uuid.UUID, levelRequest) (Level, error)
	duplicateLevel(context.Context, uuid.UUID, levelRequest) (Level, error)
	deleteLevel(context.Context, uuid.UUID) (int64, error)
	levelExists(context.Context, uuid.UUID) (bool, error)
	createGroup(context.Context, uuid.UUID, groupRequest) (SelectionGroup, error)
	getGroup(context.Context, uuid.UUID) (SelectionGroup, error)
	listGroups(context.Context, uuid.UUID) ([]SelectionGroup, error)
	updateGroup(context.Context, uuid.UUID, groupRequest) (SelectionGroup, error)
	deleteGroup(context.Context, uuid.UUID) (int64, error)
	groupExists(context.Context, uuid.UUID) (bool, error)
	addSubject(context.Context, uuid.UUID, groupSubjectRequest) error
	listSubjects(context.Context, uuid.UUID) ([]GroupSubject, error)
	removeSubject(context.Context, uuid.UUID, uuid.UUID) error
	tree(context.Context, uuid.UUID) (CurriculumTree, error)
}

type levelService struct{ store levelStore }

func optionalGradeID(value string) (pgtype.UUID, error) {
	if value == "" {
		return pgtype.UUID{}, nil
	}
	id, err := uuid.Parse(value)
	if err != nil {
		return pgtype.UUID{}, errors.New("invalid grade_id")
	}
	return pgtype.UUID{Bytes: id, Valid: true}, nil
}
func (s *levelService) create(ctx context.Context, request levelRequest) (Level, error) {
	return s.store.createLevel(ctx, request)
}
func (s *levelService) get(ctx context.Context, id uuid.UUID) (Level, error) {
	return s.store.getLevel(ctx, id)
}
func (s *levelService) list(ctx context.Context, gradeID *uuid.UUID) ([]Level, error) {
	if gradeID != nil {
		return s.store.listLevelsByGrade(ctx, *gradeID)
	}
	return s.store.listLevels(ctx)
}
func (s *levelService) update(ctx context.Context, id uuid.UUID, request levelRequest) (Level, error) {
	return s.store.updateLevel(ctx, id, request)
}
func (s *levelService) duplicate(ctx context.Context, source uuid.UUID, request levelRequest) (Level, error) {
	if _, err := s.store.getLevel(ctx, source); err != nil {
		return Level{}, errLevelNotFound
	}
	return s.store.duplicateLevel(ctx, source, request)
}
func (s *levelService) delete(ctx context.Context, id uuid.UUID) error {
	n, err := s.store.deleteLevel(ctx, id)
	if err != nil {
		return err
	}
	if n > 0 {
		return nil
	}
	exists, err := s.store.levelExists(ctx, id)
	if err != nil {
		return err
	}
	if !exists {
		return errLevelNotFound
	}
	return errLevelInUse
}
func (s *levelService) createGroup(ctx context.Context, levelID uuid.UUID, request groupRequest) (SelectionGroup, error) {
	if request.MaxSelect < request.MinSelect {
		return SelectionGroup{}, errInvalidSelectRange
	}
	if _, err := s.store.getLevel(ctx, levelID); err != nil {
		return SelectionGroup{}, errLevelNotFound
	}
	return s.store.createGroup(ctx, levelID, request)
}
func (s *levelService) listGroups(ctx context.Context, levelID uuid.UUID) ([]SelectionGroup, error) {
	return s.store.listGroups(ctx, levelID)
}
func (s *levelService) updateGroup(ctx context.Context, id uuid.UUID, request groupRequest) (SelectionGroup, error) {
	if request.MaxSelect < request.MinSelect {
		return SelectionGroup{}, errInvalidSelectRange
	}
	return s.store.updateGroup(ctx, id, request)
}
func (s *levelService) deleteGroup(ctx context.Context, id uuid.UUID) error {
	n, err := s.store.deleteGroup(ctx, id)
	if err != nil {
		return err
	}
	if n > 0 {
		return nil
	}
	exists, err := s.store.groupExists(ctx, id)
	if err != nil {
		return err
	}
	if !exists {
		return errGroupNotFound
	}
	return errGroupInUse
}
func (s *levelService) addSubject(ctx context.Context, groupID uuid.UUID, request groupSubjectRequest) error {
	if _, err := uuid.Parse(request.SubjectID); err != nil {
		return errors.New("invalid subject_id")
	}
	if request.MediumID != "" {
		if _, err := uuid.Parse(request.MediumID); err != nil {
			return errors.New("invalid medium_id")
		}
	}
	if _, err := s.store.getGroup(ctx, groupID); err != nil {
		return errGroupNotFound
	}
	return s.store.addSubject(ctx, groupID, request)
}
func (s *levelService) listSubjects(ctx context.Context, groupID uuid.UUID) ([]GroupSubject, error) {
	return s.store.listSubjects(ctx, groupID)
}
func (s *levelService) removeSubject(ctx context.Context, groupID, subjectID uuid.UUID) error {
	return s.store.removeSubject(ctx, groupID, subjectID)
}
func (s *levelService) tree(ctx context.Context, id uuid.UUID) (CurriculumTree, error) {
	return s.store.tree(ctx, id)
}

type levelHandler struct{ service *levelService }

func RegisterLevelRoutes(admin, protected *gin.RouterGroup, pool *pgxpool.Pool) {
	h := &levelHandler{service: &levelService{store: newLevelRepository(pool)}}
	admin.POST("/levels", h.createLevel)
	admin.POST("/levels/:id/duplicate", h.duplicateLevel)
	admin.PUT("/levels/:id", h.updateLevel)
	admin.DELETE("/levels/:id", h.deleteLevel)
	admin.POST("/levels/:id/groups", h.createGroup)
	admin.PUT("/groups/:group_id", h.updateGroup)
	admin.DELETE("/groups/:group_id", h.deleteGroup)
	admin.POST("/groups/:group_id/subjects", h.addSubject)
	admin.DELETE("/groups/:group_id/subjects/:subject_id", h.removeSubject)
	protected.GET("/levels", h.listLevels)
	protected.GET("/levels/:id", h.getLevel)
	protected.GET("/levels/:id/tree", h.tree)
	protected.GET("/levels/:id/groups", h.listGroups)
	protected.GET("/groups/:group_id/subjects", h.listSubjects)
}

func parseLevelID(c *gin.Context, name string) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Param(name))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return uuid.Nil, false
	}
	return id, true
}
func (h *levelHandler) createLevel(c *gin.Context) {
	var r levelRequest
	if err := httpx.BindStrict(c, &r); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.create(c, r)
	if err != nil {
		apierror.Respond(c, err)
		return
	}
	c.JSON(201, result)
}
func (h *levelHandler) getLevel(c *gin.Context) {
	id, ok := parseLevelID(c, "id")
	if !ok {
		return
	}
	result, err := h.service.get(c, id)
	if err != nil {
		c.JSON(404, gin.H{"error": "level not found"})
		return
	}
	c.JSON(200, result)
}
func (h *levelHandler) listLevels(c *gin.Context) {
	var filter *uuid.UUID
	if value := c.Query("grade_id"); value != "" {
		id, err := uuid.Parse(value)
		if err != nil {
			c.JSON(400, gin.H{"error": "invalid grade_id"})
			return
		}
		filter = &id
	}
	result, err := h.service.list(c, filter)
	if err != nil {
		apierror.Respond(c, err)
		return
	}
	c.JSON(200, result)
}
func (h *levelHandler) updateLevel(c *gin.Context) {
	id, ok := parseLevelID(c, "id")
	if !ok {
		return
	}
	var r levelRequest
	if err := httpx.BindStrict(c, &r); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.update(c, id, r)
	if err != nil {
		apierror.Respond(c, err)
		return
	}
	c.JSON(200, result)
}
func (h *levelHandler) duplicateLevel(c *gin.Context) {
	id, ok := parseLevelID(c, "id")
	if !ok {
		return
	}
	var r levelRequest
	if err := httpx.BindStrict(c, &r); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.duplicate(c, id, r)
	if errors.Is(err, errLevelNotFound) {
		c.JSON(404, gin.H{"error": err.Error()})
	} else if err != nil {
		apierror.Respond(c, err)
	} else {
		c.JSON(201, result)
	}
}
func (h *levelHandler) deleteLevel(c *gin.Context) {
	id, ok := parseLevelID(c, "id")
	if !ok {
		return
	}
	if err := h.service.delete(c, id); err != nil {
		if errors.Is(err, errLevelNotFound) {
			c.JSON(404, gin.H{"error": err.Error()})
		} else {
			c.JSON(409, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(200, gin.H{"message": "level deleted"})
}
func (h *levelHandler) createGroup(c *gin.Context) {
	id, ok := parseLevelID(c, "id")
	if !ok {
		return
	}
	var r groupRequest
	if err := httpx.BindStrict(c, &r); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.createGroup(c, id, r)
	if err != nil {
		if errors.Is(err, errLevelNotFound) {
			c.JSON(404, gin.H{"error": err.Error()})
		} else {
			apierror.Respond(c, err)
		}
		return
	}
	c.JSON(201, result)
}
func (h *levelHandler) listGroups(c *gin.Context) {
	id, ok := parseLevelID(c, "id")
	if !ok {
		return
	}
	result, err := h.service.listGroups(c, id)
	if err != nil {
		apierror.Respond(c, err)
		return
	}
	c.JSON(200, result)
}
func (h *levelHandler) updateGroup(c *gin.Context) {
	id, ok := parseLevelID(c, "group_id")
	if !ok {
		return
	}
	var r groupRequest
	if err := httpx.BindStrict(c, &r); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.updateGroup(c, id, r)
	if err != nil {
		apierror.Respond(c, err)
		return
	}
	c.JSON(200, result)
}
func (h *levelHandler) deleteGroup(c *gin.Context) {
	id, ok := parseLevelID(c, "group_id")
	if !ok {
		return
	}
	if err := h.service.deleteGroup(c, id); err != nil {
		if errors.Is(err, errGroupNotFound) {
			c.JSON(404, gin.H{"error": err.Error()})
		} else {
			c.JSON(409, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(200, gin.H{"message": "selection group deleted"})
}
func (h *levelHandler) addSubject(c *gin.Context) {
	id, ok := parseLevelID(c, "group_id")
	if !ok {
		return
	}
	var r groupSubjectRequest
	if err := httpx.BindStrict(c, &r); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	if err := h.service.addSubject(c, id, r); err != nil {
		if errors.Is(err, errGroupNotFound) {
			c.JSON(404, gin.H{"error": err.Error()})
		} else {
			apierror.Respond(c, err)
		}
		return
	}
	c.JSON(201, gin.H{"message": "subject added to group"})
}
func (h *levelHandler) listSubjects(c *gin.Context) {
	id, ok := parseLevelID(c, "group_id")
	if !ok {
		return
	}
	result, err := h.service.listSubjects(c, id)
	if err != nil {
		apierror.Respond(c, err)
		return
	}
	c.JSON(200, result)
}
func (h *levelHandler) removeSubject(c *gin.Context) {
	groupID, ok := parseLevelID(c, "group_id")
	if !ok {
		return
	}
	subjectID, err := uuid.Parse(c.Param("subject_id"))
	if err != nil {
		c.JSON(400, gin.H{"error": "invalid subject id"})
		return
	}
	if err := h.service.removeSubject(c, groupID, subjectID); err != nil {
		apierror.Respond(c, err)
		return
	}
	c.JSON(200, gin.H{"message": "subject removed from group"})
}
func (h *levelHandler) tree(c *gin.Context) {
	id, ok := parseLevelID(c, "id")
	if !ok {
		return
	}
	result, err := h.service.tree(c, id)
	if err != nil {
		if errors.Is(err, errLevelNotFound) {
			c.JSON(404, gin.H{"error": err.Error()})
		} else {
			apierror.Respond(c, err)
		}
		return
	}
	c.JSON(200, result)
}
