package people

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func runDelete(t *testing.T, studentID, recordID string, del func(context.Context, uuid.UUID, uuid.UUID) error) *httptest.ResponseRecorder {
	t.Helper()
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.DELETE("/students/:id/awards/:record_id", func(c *gin.Context) { deleteRecord(c, del, "award deleted") })
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, httptest.NewRequest(http.MethodDelete, "/students/"+studentID+"/awards/"+recordID, nil))
	return rec
}

func TestDeleteRecordPassesRecordThenStudent(t *testing.T) {
	student, record := uuid.New(), uuid.New()
	var gotRecord, gotStudent uuid.UUID
	rec := runDelete(t, student.String(), record.String(), func(_ context.Context, r, s uuid.UUID) error {
		gotRecord, gotStudent = r, s
		return nil
	})
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "award deleted") {
		t.Fatalf("got %d %s", rec.Code, rec.Body.String())
	}
	if gotRecord != record || gotStudent != student {
		t.Fatalf("ids swapped: record %s student %s", gotRecord, gotStudent)
	}
}

func TestDeleteRecordRejectsBadIDs(t *testing.T) {
	never := func(context.Context, uuid.UUID, uuid.UUID) error {
		t.Fatal("delete must not run")
		return nil
	}
	if rec := runDelete(t, "bad", uuid.NewString(), never); rec.Code != http.StatusBadRequest || !strings.Contains(rec.Body.String(), "invalid student id") {
		t.Fatalf("student: got %d %s", rec.Code, rec.Body.String())
	}
	if rec := runDelete(t, uuid.NewString(), "bad", never); rec.Code != http.StatusBadRequest || !strings.Contains(rec.Body.String(), "invalid record id") {
		t.Fatalf("record: got %d %s", rec.Code, rec.Body.String())
	}
}

func TestDeleteRecordReportsServiceError(t *testing.T) {
	rec := runDelete(t, uuid.NewString(), uuid.NewString(), func(context.Context, uuid.UUID, uuid.UUID) error {
		return errors.New("not found for student")
	})
	if rec.Code != http.StatusBadRequest || !strings.Contains(rec.Body.String(), "not found for student") {
		t.Fatalf("got %d %s", rec.Code, rec.Body.String())
	}
}
