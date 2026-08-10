package handlers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/services"
)

type MeHandler struct {
	service *services.MeService
}

func NewMeHandler(service *services.MeService) *MeHandler {
	return &MeHandler{service: service}
}

// Get godoc
// @Summary      Current user
// @Description  Returns the signed-in identity's claims, provisioning a local user row on first sign-in
// @Tags         me
// @Produce      json
// @Security     BearerAuth
// @Success      200 {object} map[string]any
// @Router       /me [get]
func (h *MeHandler) Get(c *gin.Context) {
	userID := c.GetString("userID")
	email := c.GetString("email")
	givenName := c.GetString("given_name")
	familyName := c.GetString("family_name")

	tokenRoles, _ := c.Get("roles")
	roleList, _ := tokenRoles.([]string)
	role := services.ResolveAppRole(roleList)

	mustChangePassword := false
	if parsedID, err := uuid.Parse(userID); err == nil {
		fullName := givenName + " " + familyName
		user, err := h.service.EnsureProvisioned(c.Request.Context(), parsedID, email, fullName, role)
		if err != nil {
			log.Printf("/me: failed to provision local user %s: %v", parsedID, err)
		} else {
			mustChangePassword = user.MustChangePassword
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"user_id":              userID,
		"email":                email,
		"username":             c.GetString("username"),
		"given_name":           givenName,
		"family_name":          familyName,
		"phone_number":         c.GetString("phone_number"),
		"roles":                tokenRoles,
		"must_change_password": mustChangePassword,
	})
}
