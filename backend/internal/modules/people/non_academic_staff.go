package people

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/apierror"
	"github.com/openschool-org/openschool/internal/middleware"
	"github.com/openschool-org/openschool/internal/platform/httpx"
	"github.com/openschool-org/openschool/internal/ports"
	"github.com/openschool-org/openschool/internal/validation"
)

var (
	ErrNonAcademicStaffNotFound          = errors.New("staff member not found")
	ErrInvalidNonAcademicDesignation     = errors.New("invalid designation")
	ErrInvalidNonAcademicEmploymentState = errors.New("invalid status — must be active, resigned or transferred")
)

type staffCreate struct {
	FullName, EmployeeNumber, Designation, Phone, Gender string
	JoinedDate                                           time.Time
	HouseID                                              *uuid.UUID
}
type staffUpdate struct{ FullName, Designation, Phone, Gender string }
type staffRecord struct{ HouseID *uuid.UUID }
// StaffListParams is the non-academic-staff pagination request: the shared
// limit/offset/search contract plus the designation filter.
type StaffListParams struct {
	httpx.PageParams
	Sort        httpx.SortParams
	Designation string
}

type nonAcademicStaffStore interface {
	nextStaffEmployeeNumber(context.Context) (string, error)
	createStaff(context.Context, staffCreate) (any, error)
	getStaff(context.Context, uuid.UUID) (any, error)
	staffRecord(context.Context, uuid.UUID) (staffRecord, error)
	listStaffPage(context.Context, StaffListParams) (any, error)
	updateStaff(context.Context, uuid.UUID, staffUpdate) (any, error)
	updateStaffStatus(context.Context, uuid.UUID, string) (any, error)
	updateStaffHouse(context.Context, uuid.UUID, *uuid.UUID) (any, error)
	deleteStaff(context.Context, uuid.UUID) (int64, error)
}

type NonAcademicStaffService struct {
	store nonAcademicStaffStore
	audit ports.AuditRecorder
}

func NewNonAcademicStaffService(store nonAcademicStaffStore, audit ports.AuditRecorder) *NonAcademicStaffService {
	return &NonAcademicStaffService{store: store, audit: audit}
}
func (s *NonAcademicStaffService) Create(ctx context.Context, req CreateNonAcademicStaffRequest) (any, error) {
	if !ValidNonAcademicDesignations[req.Designation] {
		return nil, ErrInvalidNonAcademicDesignation
	}
	if !validation.IsValidSriLankanPhone(req.Phone) {
		return nil, validation.ErrInvalidPhone
	}
	number, err := s.store.nextStaffEmployeeNumber(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to assign employee number: %w", err)
	}
	house, err := optionalUUID(req.HouseID, "house")
	if err != nil {
		return nil, err
	}
	return s.store.createStaff(ctx, staffCreate{FullName: req.FullName, EmployeeNumber: number, Designation: req.Designation, Phone: req.Phone, JoinedDate: req.JoinedDate, Gender: req.Gender, HouseID: house})
}
func (s *NonAcademicStaffService) Get(ctx context.Context, id uuid.UUID) (any, error) {
	value, err := s.store.getStaff(ctx, id)
	if err != nil {
		return nil, ErrNonAcademicStaffNotFound
	}
	return value, nil
}
func (s *NonAcademicStaffService) ListPage(ctx context.Context, params StaffListParams) (any, error) {
	return s.store.listStaffPage(ctx, params)
}
func (s *NonAcademicStaffService) Update(ctx context.Context, id uuid.UUID, req UpdateNonAcademicStaffRequest) (any, error) {
	if !ValidNonAcademicDesignations[req.Designation] {
		return nil, ErrInvalidNonAcademicDesignation
	}
	if !validation.IsValidSriLankanPhone(req.Phone) {
		return nil, validation.ErrInvalidPhone
	}
	return s.store.updateStaff(ctx, id, staffUpdate(req))
}
func (s *NonAcademicStaffService) SetEmploymentStatus(ctx context.Context, id uuid.UUID, status string) (any, error) {
	if status != "active" && status != "resigned" && status != "transferred" {
		return nil, ErrInvalidNonAcademicEmploymentState
	}
	return s.store.updateStaffStatus(ctx, id, status)
}
func (s *NonAcademicStaffService) UpdateHouse(ctx context.Context, id uuid.UUID, raw string, actor uuid.UUID) (any, error) {
	house, err := optionalUUID(raw, "house")
	if err != nil {
		return nil, err
	}
	before, err := s.store.staffRecord(ctx, id)
	if err != nil {
		return nil, ErrNonAcademicStaffNotFound
	}
	updated, err := s.store.updateStaffHouse(ctx, id, house)
	if err != nil {
		return nil, err
	}
	if s.audit != nil {
		_ = s.audit.Record(ctx, "non_academic_staff_house", id, "house_changed", actor, staffRecord{HouseID: before.HouseID}, staffRecord{HouseID: house}, "")
	}
	return updated, nil
}
func (s *NonAcademicStaffService) Delete(ctx context.Context, id uuid.UUID) error {
	rows, err := s.store.deleteStaff(ctx, id)
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrNonAcademicStaffNotFound
	}
	return nil
}

func optionalUUID(raw, label string) (*uuid.UUID, error) {
	if raw == "" {
		return nil, nil
	}
	id, err := uuid.Parse(raw)
	if err != nil {
		return nil, fmt.Errorf("invalid %s id", label)
	}
	return &id, nil
}

func RegisterNonAcademicStaffRoutes(admin, teacherOrAdmin *gin.RouterGroup, service *NonAcademicStaffService) {
	teacherOrAdmin.GET("/non-academic-staff", func(c *gin.Context) {
		params := StaffListParams{PageParams: httpx.ParsePage(c), Sort: httpx.ParseSort(c, "name", "employee", "designation", "joined"), Designation: c.Query("designation")}
		value, err := service.ListPage(c, params)
		if err != nil {
			apierror.RespondInternal(c, err)
			return
		}
		c.JSON(http.StatusOK, value)
	})
	teacherOrAdmin.GET("/non-academic-staff/:id", func(c *gin.Context) {
		id, ok := staffID(c)
		if !ok {
			return
		}
		value, err := service.Get(c, id)
		if errors.Is(err, ErrNonAcademicStaffNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		staffResponse(c, http.StatusOK, value, err)
	})
	admin.POST("/non-academic-staff", func(c *gin.Context) {
		var req CreateNonAcademicStaffRequest
		if !staffBind(c, &req) {
			return
		}
		value, err := service.Create(c, req)
		staffResponse(c, http.StatusCreated, value, err)
	})
	admin.PUT("/non-academic-staff/:id", func(c *gin.Context) {
		id, ok := staffID(c)
		if !ok {
			return
		}
		var req UpdateNonAcademicStaffRequest
		if !staffBind(c, &req) {
			return
		}
		value, err := service.Update(c, id, req)
		staffResponse(c, http.StatusOK, value, err)
	})
	admin.PUT("/non-academic-staff/:id/employment-status", func(c *gin.Context) {
		id, ok := staffID(c)
		if !ok {
			return
		}
		var req UpdateNonAcademicStaffEmploymentStatusRequest
		if !staffBind(c, &req) {
			return
		}
		value, err := service.SetEmploymentStatus(c, id, req.Status)
		staffResponse(c, http.StatusOK, value, err)
	})
	admin.PUT("/non-academic-staff/:id/house", func(c *gin.Context) {
		id, ok := staffID(c)
		if !ok {
			return
		}
		var req UpdateNonAcademicStaffHouseRequest
		if !staffBind(c, &req) {
			return
		}
		actor, err := middleware.UserIDFromContext(c)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
			return
		}
		value, err := service.UpdateHouse(c, id, req.HouseID, actor)
		staffResponse(c, http.StatusOK, value, err)
	})
	admin.DELETE("/non-academic-staff/:id", func(c *gin.Context) {
		id, ok := staffID(c)
		if !ok {
			return
		}
		if err := service.Delete(c, id); err != nil {
			status := http.StatusBadRequest
			if errors.Is(err, ErrNonAcademicStaffNotFound) {
				status = http.StatusNotFound
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "staff member deleted"})
	})
}
func staffID(c *gin.Context) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return uuid.Nil, false
	}
	return id, true
}
func staffBind(c *gin.Context, value any) bool {
	if err := httpx.BindStrict(c, value); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return false
	}
	return true
}
func staffResponse(c *gin.Context, status int, value any, err error) {
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(status, value)
}
