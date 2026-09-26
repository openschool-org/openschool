//go:build integration

package audit

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/testutil/testdb"
)

func TestAuditLogPersistenceAndFilteringWithPostgres(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := testdb.Open(t)
	ctx := context.Background()
	actorID, studentID, otherStudentID := uuid.New(), uuid.New(), uuid.New()
	if _, err := pool.Exec(ctx, "INSERT INTO users (id, email, full_name, role) VALUES ($1, 'audit-admin@example.test', 'Audit Admin', 'admin')", actorID); err != nil {
		t.Fatal(err)
	}
	service := NewService(NewRepository(pool))
	if err := service.Record(ctx, "student", studentID, "updated", actorID, map[string]string{"status": "old"}, map[string]string{"status": "active"}, "verified"); err != nil {
		t.Fatal(err)
	}
	if err := service.Record(ctx, "student", otherStudentID, "created", actorID, nil, map[string]string{"status": "active"}, ""); err != nil {
		t.Fatal(err)
	}

	router := gin.New()
	RegisterRoutes(router.Group(""), service)
	request := httptest.NewRequest(http.MethodGet, "/audit-logs?entity_type=student&entity_id="+studentID.String(), nil)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	if response.Code != http.StatusOK || !strings.Contains(response.Body.String(), `"action":"updated"`) || !strings.Contains(response.Body.String(), `"actor_name":"Audit Admin"`) || !strings.Contains(response.Body.String(), `"reason":"verified"`) || strings.Contains(response.Body.String(), otherStudentID.String()) {
		t.Fatalf("filtered audit logs: code=%d body=%s", response.Code, response.Body.String())
	}
	invalid := httptest.NewRequest(http.MethodGet, "/audit-logs?entity_id=not-a-uuid", nil)
	invalidResponse := httptest.NewRecorder()
	router.ServeHTTP(invalidResponse, invalid)
	if invalidResponse.Code != http.StatusBadRequest {
		t.Fatalf("invalid audit filter: code=%d body=%s", invalidResponse.Code, invalidResponse.Body.String())
	}

	get := func(path string) string {
		res := httptest.NewRecorder()
		router.ServeHTTP(res, httptest.NewRequest(http.MethodGet, path, nil))
		if res.Code != http.StatusOK {
			t.Fatalf("GET %s: code=%d body=%s", path, res.Code, res.Body.String())
		}
		return res.Body.String()
	}
	if body := get("/audit-logs?search=verif"); !strings.Contains(body, `"total":1`) {
		t.Fatalf("search by reason: %s", body)
	}
	if body := get("/audit-logs?search=audit%20adm"); !strings.Contains(body, `"total":2`) {
		t.Fatalf("search by actor: %s", body)
	}
	if body := get("/audit-logs?from=2000-01-01&to=2000-12-31"); !strings.Contains(body, `"total":0`) {
		t.Fatalf("date range: %s", body)
	}
	if body := get("/audit-logs/entity-types"); !strings.Contains(body, `"student"`) {
		t.Fatalf("entity types: %s", body)
	}
}
