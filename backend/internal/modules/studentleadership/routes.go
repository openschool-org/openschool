package studentleadership

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/apierror"
	"github.com/openschool-org/openschool/internal/authz"
	"github.com/openschool-org/openschool/internal/middleware"
	"github.com/openschool-org/openschool/internal/platform/httpx"
)

func societyError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrSocietyNotFound), errors.Is(err, ErrSocietyMemberNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
	case errors.Is(err, ErrNotTeacherInCharge):
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	}
}

func routeActor(c *gin.Context) (Actor, error) {
	id, err := middleware.UserIDFromContext(c)
	if err != nil {
		return Actor{}, err
	}
	roles, _ := c.Get("roles")
	roleList, _ := roles.([]string)
	return Actor{ID: id, Role: authz.ResolveAppRole(roleList)}, nil
}

type handler struct{ service *Service }

func RegisterRoutes(admin, teacherOrAdmin, studentAccess *gin.RouterGroup, service *Service) {
	h := &handler{service: service}
	admin.PUT("/prefects", h.assignPrefect)
	teacherOrAdmin.GET("/prefects", h.listPrefects)
	teacherOrAdmin.GET("/prefects/years", h.listPrefectYears)
	studentAccess.GET("/students/:id/prefect-appointments", h.listStudentPrefects)
	admin.DELETE("/prefects/:id", h.deletePrefect)
	admin.POST("/societies", h.createSociety)
	admin.PUT("/societies/:id", h.updateSociety)
	admin.DELETE("/societies/:id", h.deleteSociety)
	teacherOrAdmin.GET("/societies", h.listSocieties)
	teacherOrAdmin.GET("/societies/years", h.listSocietyYears)
	teacherOrAdmin.GET("/societies/:id/members", h.listSocietyMembers)
	teacherOrAdmin.PUT("/societies/:id/members", h.assignSocietyMember)
	teacherOrAdmin.POST("/societies/:id/members/:memberId/deactivate", h.deactivateSocietyMember)
	studentAccess.GET("/students/:id/society-memberships", h.listStudentSocieties)
}

func (h *handler) assignPrefect(c *gin.Context) {
	var req AssignPrefectRequest
	if err := httpx.BindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	prefect, err := h.service.AssignPrefect(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, prefect)
}

func (h *handler) listPrefects(c *gin.Context) {
	yearID, err := uuid.Parse(c.Query("academic_year_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "a valid academic_year_id is required"})
		return
	}
	prefects, err := h.service.ListPrefectsByYear(c.Request.Context(), yearID)
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, prefects)
}

func (h *handler) listPrefectYears(c *gin.Context) {
	years, err := h.service.ListPrefectYears(c.Request.Context())
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, years)
}

func (h *handler) listStudentPrefects(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student id"})
		return
	}
	appointments, err := h.service.ListPrefectsByStudent(c.Request.Context(), studentID)
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, appointments)
}

func (h *handler) deletePrefect(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	if err := h.service.DeletePrefect(c.Request.Context(), id); err != nil {
		if errors.Is(err, ErrPrefectNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			apierror.RespondInternal(c, err)
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "prefect appointment removed"})
}

func (h *handler) createSociety(c *gin.Context) {
	var req CreateSocietyRequest
	if err := httpx.BindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	society, err := h.service.CreateSociety(c.Request.Context(), req)
	if err != nil {
		societyError(c, err)
		return
	}
	c.JSON(http.StatusCreated, society)
}

func (h *handler) updateSociety(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid society id"})
		return
	}
	var req UpdateSocietyRequest
	if err := httpx.BindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	society, err := h.service.UpdateSociety(c.Request.Context(), id, req)
	if err != nil {
		societyError(c, err)
		return
	}
	c.JSON(http.StatusOK, society)
}

func (h *handler) deleteSociety(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid society id"})
		return
	}
	if err := h.service.DeleteSociety(c.Request.Context(), id); err != nil {
		societyError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "society deleted"})
}

func (h *handler) listSocieties(c *gin.Context) {
	yearID, err := uuid.Parse(c.Query("academic_year_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "a valid academic_year_id is required"})
		return
	}
	societies, err := h.service.ListSocietiesByYear(c.Request.Context(), yearID)
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, societies)
}

func (h *handler) listSocietyYears(c *gin.Context) {
	years, err := h.service.ListSocietyYears(c.Request.Context())
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, years)
}

func (h *handler) listSocietyMembers(c *gin.Context) {
	societyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid society id"})
		return
	}
	members, err := h.service.ListSocietyMembers(c.Request.Context(), societyID)
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, members)
}

func (h *handler) assignSocietyMember(c *gin.Context) {
	societyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid society id"})
		return
	}
	var req AssignSocietyMemberRequest
	if err := httpx.BindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	actor, err := routeActor(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return
	}
	member, err := h.service.AssignSocietyMember(c.Request.Context(), actor, societyID, req)
	if err != nil {
		societyError(c, err)
		return
	}
	c.JSON(http.StatusOK, member)
}

func (h *handler) deactivateSocietyMember(c *gin.Context) {
	societyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid society id"})
		return
	}
	memberID, err := uuid.Parse(c.Param("memberId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid member id"})
		return
	}
	actor, err := routeActor(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return
	}
	var req DeactivateSocietyMemberRequest
	if err := httpx.BindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.service.DeactivateSocietyMember(c.Request.Context(), actor, societyID, memberID, req.Reason); err != nil {
		societyError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "society member deactivated"})
}

func (h *handler) listStudentSocieties(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student id"})
		return
	}
	memberships, err := h.service.ListSocietyMembershipsByStudent(c.Request.Context(), studentID)
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, memberships)
}
