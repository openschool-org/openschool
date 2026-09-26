package identity

import (
	"context"
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	authz "github.com/openschool-org/openschool/internal/authz"
	"github.com/openschool-org/openschool/internal/modules/auth"
)

type userProvisioner interface {
	ensureExists(ctx context.Context, command ensureUserCommand) (provisionedUser, error)
	setLanguage(ctx context.Context, id uuid.UUID, language string) error
}

// supportedLanguages mirrors the users.preferred_language CHECK constraint.
var supportedLanguages = map[string]bool{"en": true, "si": true, "ta": true}

type ensureUserCommand struct {
	ID       uuid.UUID
	Email    string
	FullName string
	Role     string
}

type provisionedUser struct {
	MustChangePassword  bool
	KeptDefaultPassword bool
	CreatedAt           time.Time
	PreferredLanguage   string
}

// defaultPasswordExpired reports whether a "keep this password" choice has
// stood long enough that the account must actually change its password
// (S1) — mirrors auth.Service.KeepDefaultPassword's own check, so /me and
// the write path that enforces it never disagree.
func (u provisionedUser) defaultPasswordExpired(now time.Time) bool {
	return u.KeptDefaultPassword && now.Sub(u.CreatedAt) > auth.DefaultPasswordExpiry
}

type meService struct{ users userProvisioner }

func newMeService(users userProvisioner) *meService { return &meService{users: users} }

func (s *meService) ensureProvisioned(ctx context.Context, command ensureUserCommand) (provisionedUser, error) {
	if command.Role == "" {
		return provisionedUser{}, nil
	}
	return s.users.ensureExists(ctx, command)
}

func (s *meService) setLanguage(ctx context.Context, id uuid.UUID, language string) error {
	if !supportedLanguages[language] {
		return errUnsupportedLanguage
	}
	return s.users.setLanguage(ctx, id, language)
}

var errUnsupportedLanguage = errors.New("language must be one of en, si, ta")

type meHandler struct{ service *meService }

func newMeHandler(service *meService) *meHandler { return &meHandler{service: service} }

func (h *meHandler) get(c *gin.Context) {
	userID := c.GetString("userID")
	email := c.GetString("email")
	givenName := c.GetString("given_name")
	familyName := c.GetString("family_name")
	tokenRoles, _ := c.Get("roles")
	roleList, _ := tokenRoles.([]string)

	mustChangePassword := false
	defaultPasswordExpired := false
	preferredLanguage := "en"
	if parsedID, err := uuid.Parse(userID); err == nil {
		user, provisionErr := h.service.ensureProvisioned(c.Request.Context(), ensureUserCommand{
			ID: parsedID, Email: email, FullName: givenName + " " + familyName, Role: authz.ResolveAppRole(roleList),
		})
		if provisionErr != nil {
			log.Printf("/me: failed to provision local user %s: %v", parsedID, provisionErr)
		} else {
			// A "keep this password" choice re-triggers the interstitial once
			// it expires, even though must_change_password itself was
			// already cleared at the time of that choice (S1).
			defaultPasswordExpired = user.defaultPasswordExpired(time.Now())
			mustChangePassword = user.MustChangePassword || defaultPasswordExpired
			if user.PreferredLanguage != "" {
				preferredLanguage = user.PreferredLanguage
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"user_id": userID, "email": email, "username": c.GetString("username"),
		"given_name": givenName, "family_name": familyName,
		"phone_number": c.GetString("phone_number"), "roles": tokenRoles,
		"must_change_password":     mustChangePassword,
		"default_password_expired": defaultPasswordExpired,
		"preferred_language":       preferredLanguage,
	})
}

type setLanguageRequest struct {
	Language string `json:"language" binding:"required"`
}

func (h *meHandler) setLanguage(c *gin.Context) {
	id, err := uuid.Parse(c.GetString("userID"))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return
	}
	var req setLanguageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "language is required"})
		return
	}
	if err := h.service.setLanguage(c.Request.Context(), id, req.Language); err != nil {
		if errors.Is(err, errUnsupportedLanguage) {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		log.Printf("/me/language: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save language"})
		return
	}
	c.Status(http.StatusNoContent)
}
