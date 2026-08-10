package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/services"
)

type AuthHandler struct {
	service *services.AuthService
}

func NewAuthHandler(service *services.AuthService) *AuthHandler {
	return &AuthHandler{service: service}
}

// ForgotPassword godoc
// @Summary      Forgot password
// @Description  Verifies identity (email + NIC/index number) and issues a one-time reset token. Not available for admin accounts.
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        request body models.ForgotPasswordRequest true "Identity details"
// @Success      200 {object} models.ForgotPasswordResponse
// @Failure      400 {object} map[string]string
// @Router       /auth/forgot-password [post]
func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req models.ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.service.ForgotPassword(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// ResetPassword godoc
// @Summary      Reset password
// @Description  Sets a new password using the one-time token from ForgotPassword
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        request body models.ResetPasswordRequest true "Reset token and new password"
// @Success      200 {object} map[string]string
// @Failure      400 {object} map[string]string
// @Router       /auth/reset-password [post]
func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req models.ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.ResetPassword(c.Request.Context(), req); err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, services.ErrResetTokenInvalid) {
			status = http.StatusUnauthorized
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "password updated"})
}

// ChangePassword godoc
// @Summary      Change password
// @Description  Sets a new password for the signed-in user — also used by the first-login "set a new password" choice
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        request body models.ChangePasswordRequest true "New password"
// @Success      200 {object} map[string]string
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /auth/change-password [post]
func (h *AuthHandler) ChangePassword(c *gin.Context) {
	actor, err := actorFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	var req models.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.ChangePassword(c.Request.Context(), actor.ID, req.NewPassword); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "password updated"})
}

// KeepDefaultPassword godoc
// @Summary      Keep default password
// @Description  Clears the must-change-password flag without changing the password — the first-login "keep this password" choice
// @Tags         auth
// @Produce      json
// @Success      200 {object} map[string]string
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /auth/keep-default-password [post]
func (h *AuthHandler) KeepDefaultPassword(c *gin.Context) {
	actor, err := actorFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.KeepDefaultPassword(c.Request.Context(), actor.ID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "password kept"})
}
