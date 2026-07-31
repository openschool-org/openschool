package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/repositories"
)

// TeacherSelfHandler serves the self-service endpoint a signed-in teacher
// uses to resolve their own teacher_profile ID — everything else (classes,
// subjects, attendance, marks) is then fetched via the existing
// teacherOrAdmin routes (e.g. GET /teachers/:id/workload) using that ID,
// exactly like the admin UI would for any other teacher.
type TeacherSelfHandler struct {
	teachers *repositories.TeacherRepository
}

func NewTeacherSelfHandler(teachers *repositories.TeacherRepository) *TeacherSelfHandler {
	return &TeacherSelfHandler{teachers: teachers}
}

// Profile godoc
// @Summary      The signed-in teacher's own profile
// @Tags         teacher
// @Produce      json
// @Success      200  {object}  map[string]any
// @Failure      404  {object}  map[string]string
// @Security     BearerAuth
// @Router       /me/teacher [get]
func (h *TeacherSelfHandler) Profile(c *gin.Context) {
	callerID, err := uuid.Parse(c.GetString("userID"))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return
	}

	teacher, err := h.teachers.GetByUserID(c.Request.Context(), callerID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no teacher profile linked to this account"})
		return
	}

	c.JSON(http.StatusOK, teacher)
}
