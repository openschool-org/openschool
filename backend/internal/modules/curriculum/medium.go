// Package curriculum owns curriculum configuration and its related workflows.
package curriculum

import (
	"context"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/apierror"
	"github.com/openschool-org/openschool/internal/middleware"
	"github.com/openschool-org/openschool/internal/platform/httpx"
)

// referenceDataMaxAgeSeconds is how long a client may cache rarely-changing
// reference data (mediums) before revalidating (section 5).
const referenceDataMaxAgeSeconds = 0 // revalidate every time; the ETag keeps it cheap (E12)

var (
	errMediumNotFound = errors.New("medium not found")
	errMediumInUse    = errors.New("medium is in use and cannot be deleted")
)

type Medium struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	CreatedAt string `json:"created_at"`
}

type mediumRequest struct {
	Name string `json:"name" binding:"required"`
}

type mediumStore interface {
	createMedium(context.Context, string) (Medium, error)
	listMediums(context.Context) ([]Medium, error)
	updateMedium(context.Context, uuid.UUID, string) (Medium, error)
	deleteMedium(context.Context, uuid.UUID) (int64, error)
	mediumExists(context.Context, uuid.UUID) (bool, error)
}

type mediumService struct{ store mediumStore }

func (s *mediumService) create(ctx context.Context, request mediumRequest) (Medium, error) {
	return s.store.createMedium(ctx, request.Name)
}

func (s *mediumService) list(ctx context.Context) ([]Medium, error) {
	return s.store.listMediums(ctx)
}

func (s *mediumService) update(ctx context.Context, id uuid.UUID, request mediumRequest) (Medium, error) {
	return s.store.updateMedium(ctx, id, request.Name)
}

func (s *mediumService) delete(ctx context.Context, id uuid.UUID) error {
	rows, err := s.store.deleteMedium(ctx, id)
	if err != nil {
		return err
	}
	if rows > 0 {
		return nil
	}
	exists, err := s.store.mediumExists(ctx, id)
	if err != nil {
		return err
	}
	if !exists {
		return errMediumNotFound
	}
	return errMediumInUse
}

type mediumHandler struct{ service *mediumService }

func RegisterMediumRoutes(admin, protected *gin.RouterGroup, pool *pgxpool.Pool) {
	handler := &mediumHandler{service: &mediumService{store: newMediumRepository(pool)}}
	admin.POST("/mediums", handler.create)
	admin.PUT("/mediums/:id", handler.update)
	admin.DELETE("/mediums/:id", handler.delete)
	protected.GET("/mediums", middleware.CacheReference(referenceDataMaxAgeSeconds), handler.list)
}

func (h *mediumHandler) create(c *gin.Context) {
	var request mediumRequest
	if err := httpx.BindStrict(c, &request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	medium, err := h.service.create(c.Request.Context(), request)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, medium)
}

func (h *mediumHandler) list(c *gin.Context) {
	mediums, err := h.service.list(c.Request.Context())
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, mediums)
}

func (h *mediumHandler) update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	var request mediumRequest
	if err := httpx.BindStrict(c, &request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	medium, err := h.service.update(c.Request.Context(), id, request)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, medium)
}

func (h *mediumHandler) delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	if err := h.service.delete(c.Request.Context(), id); err != nil {
		switch {
		case errors.Is(err, errMediumNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		case errors.Is(err, errMediumInUse):
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "medium deleted"})
}
