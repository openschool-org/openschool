package auth

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/openschool-org/openschool/internal/apierror"
	"github.com/openschool-org/openschool/internal/middleware"
	"github.com/openschool-org/openschool/internal/platform/httpx"
)

// AuthHandler exposes the unauthenticated password-lifecycle endpoints (forgot/reset/change password).
type AuthHandler struct {
	service *Service
}

// NewAuthHandler constructs an AuthHandler with its service dependency.
func NewAuthHandler(service *Service) *AuthHandler {
	return &AuthHandler{service: service}
}

// ForgotPassword verifies identity (email + NIC/index number) and issues a one-time reset token. Not available for admin accounts.
func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req ForgotPasswordRequest
	if err := httpx.BindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "enter your role, email and NIC or index number"})
		return
	}

	// A match and a mismatch get the same 200, so the endpoint cannot be used
	// to test whether a NIC or index number belongs to an email (S1).
	resp, err := h.service.ForgotPassword(c.Request.Context(), req)
	if errors.Is(err, ErrInvalidCredentials) {
		c.JSON(http.StatusOK, ForgotPasswordResponse{Message: forgotPasswordMessage})
		return
	}
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}

	c.JSON(http.StatusOK, resp)
}

// ResetPassword sets a new password using the one-time token from ForgotPassword.
func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.ResetPassword(c.Request.Context(), req); err != nil {
		respondPasswordError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "password updated"})
}

// ChangePassword sets a new password for the signed-in user — also used by the first-login "set a new password" choice.
func (h *AuthHandler) ChangePassword(c *gin.Context) {
	actorID, err := middleware.UserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return
	}

	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.ChangePassword(c.Request.Context(), actorID, req.NewPassword); err != nil {
		respondPasswordError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "password updated"})
}

// KeepDefaultPassword clears the must-change-password flag without changing the password.
func (h *AuthHandler) KeepDefaultPassword(c *gin.Context) {
	actorID, err := middleware.UserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return
	}

	if err := h.service.KeepDefaultPassword(c.Request.Context(), actorID); err != nil {
		respondPasswordError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "password kept"})
}

// respondPasswordError sends the hand-written password errors as they are and
// hides anything else (identity provider URLs, SMTP hosts, SQL) behind a 500 (S8).
func respondPasswordError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrResetTokenInvalid):
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
	case errors.Is(err, ErrWeakPassword), errors.Is(err, ErrPasswordTooShort),
		errors.Is(err, ErrDefaultPasswordExpired), errors.Is(err, ErrPasswordAlreadyChanged):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	default:
		apierror.RespondInternal(c, err)
	}
}
