//go:build integration

package auth

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/testutil/testdb"
)

type integrationPasswordUpdater struct {
	userID   string
	password string
	calls    int
}

func (u *integrationPasswordUpdater) UpdatePassword(_ context.Context, userID, password string) error {
	u.userID, u.password, u.calls = userID, password, u.calls+1
	return nil
}

func TestPasswordAPIWithPostgres(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := testdb.Open(t)
	userID := uuid.New()
	if _, err := pool.Exec(context.Background(), `
		INSERT INTO users (id, email, full_name, role, must_change_password)
		VALUES ($1, $2, $3, $4, TRUE)`, userID, "admin@example.test", "Admin User", "admin"); err != nil {
		t.Fatalf("seed user: %v", err)
	}

	repository := NewRepository(pool)
	provider := &integrationPasswordUpdater{}
	service := NewService(repository, nil, provider, nil)
	handler := NewAuthHandler(service)
	router := gin.New()
	router.POST("/auth/change-password", func(c *gin.Context) {
		c.Set("userID", userID.String())
		handler.ChangePassword(c)
	})
	router.POST("/auth/reset-password", handler.ResetPassword)

	changed := performAuthRequest(t, router, "/auth/change-password", ChangePasswordRequest{NewPassword: "changed-password"})
	if changed.Code != http.StatusOK || provider.userID != userID.String() || provider.password != "changed-password" {
		t.Fatalf("change password: code=%d provider=%+v body=%s", changed.Code, provider, changed.Body.String())
	}
	assertMustChangePassword(t, pool, userID, false)

	if _, err := pool.Exec(context.Background(), "UPDATE users SET must_change_password = TRUE WHERE id = $1", userID); err != nil {
		t.Fatal(err)
	}
	const rawToken = "one-time-reset-token"
	if err := repository.createResetToken(context.Background(), userID, hashResetToken(rawToken), time.Now().Add(time.Minute)); err != nil {
		t.Fatalf("create reset token: %v", err)
	}
	reset := performAuthRequest(t, router, "/auth/reset-password", ResetPasswordRequest{Token: rawToken, NewPassword: "reset-password"})
	if reset.Code != http.StatusOK || provider.calls != 2 || provider.password != "reset-password" {
		t.Fatalf("reset password: code=%d provider=%+v body=%s", reset.Code, provider, reset.Body.String())
	}
	assertMustChangePassword(t, pool, userID, false)

	reused := performAuthRequest(t, router, "/auth/reset-password", ResetPasswordRequest{Token: rawToken, NewPassword: "another-password"})
	if reused.Code != http.StatusUnauthorized || provider.calls != 2 {
		t.Fatalf("reuse reset token: code=%d provider_calls=%d body=%s", reused.Code, provider.calls, reused.Body.String())
	}
}

func performAuthRequest(t *testing.T, router http.Handler, path string, body any) *httptest.ResponseRecorder {
	t.Helper()
	payload, err := json.Marshal(body)
	if err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(payload))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	return response
}

func assertMustChangePassword(t *testing.T, pool *pgxpool.Pool, userID uuid.UUID, want bool) {
	t.Helper()
	var actual bool
	if err := pool.QueryRow(context.Background(), "SELECT must_change_password FROM users WHERE id = $1", userID).Scan(&actual); err != nil {
		t.Fatalf("read must_change_password: %v", err)
	}
	if actual != want {
		t.Fatalf("must_change_password=%v, want %v", actual, want)
	}
}
