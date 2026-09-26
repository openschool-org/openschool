//go:build integration

package notifications

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/authz"
	"github.com/openschool-org/openschool/internal/testutil/testdb"
)

type notificationFixture struct {
	adminUserID, teacherUserID, studentUserID, guardianUserID uuid.UUID
	classID                                                   uuid.UUID
}

func TestNotificationComposerAndInboxAPIWithPostgres(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := testdb.Open(t)
	fixture := seedNotificationFixture(t, pool)
	service := NewNotificationService(NewNotificationRepository(pool))
	adminRouter := notificationRouter(service, fixture.adminUserID, authz.RoleAdmin)
	studentRouter := notificationRouter(service, fixture.studentUserID, authz.RoleStudent)

	request := CreateNotificationRequest{
		Title: "Initial title", Message: "Initial message", Category: "academic", Priority: "normal", SaveAsDraft: true,
		RecipientRules: []RecipientRule{{Type: RuleClass, ClassID: &fixture.classID, Label: "Grade 8 A"}},
	}
	created := performNotificationRequest(t, adminRouter, http.MethodPost, "/notifications", request)
	if created.Code != http.StatusCreated {
		t.Fatalf("create notification draft: code=%d body=%s", created.Code, created.Body.String())
	}
	var draft NotificationResponse
	if err := json.Unmarshal(created.Body.Bytes(), &draft); err != nil {
		t.Fatal(err)
	}
	if draft.ID == uuid.Nil || draft.Status != StatusDraft {
		t.Fatalf("unexpected draft: %+v", draft)
	}
	assertNotificationState(t, pool, draft.ID, StatusDraft, 0)

	update := UpdateNotificationRequest{Title: "Assessment reminder", Message: "Bring your project file.", Category: "academic", Priority: "important", RecipientRules: request.RecipientRules}
	updated := performNotificationRequest(t, adminRouter, http.MethodPut, "/notifications/"+draft.ID.String(), update)
	if updated.Code != http.StatusOK || !bytes.Contains(updated.Body.Bytes(), []byte(`"title":"Assessment reminder"`)) {
		t.Fatalf("update notification draft: code=%d body=%s", updated.Code, updated.Body.String())
	}
	drafts := performNotificationRequest(t, adminRouter, http.MethodGet, "/notifications/drafts", nil)
	if drafts.Code != http.StatusOK || !bytes.Contains(drafts.Body.Bytes(), []byte(draft.ID.String())) {
		t.Fatalf("list notification drafts: code=%d body=%s", drafts.Code, drafts.Body.String())
	}

	sent := performNotificationRequest(t, adminRouter, http.MethodPost, "/notifications/"+draft.ID.String()+"/send", nil)
	if sent.Code != http.StatusOK || !bytes.Contains(sent.Body.Bytes(), []byte(`"status":"sent"`)) {
		t.Fatalf("send notification draft: code=%d body=%s", sent.Code, sent.Body.String())
	}
	assertNotificationState(t, pool, draft.ID, StatusSent, 3)
	resent := performNotificationRequest(t, adminRouter, http.MethodPost, "/notifications/"+draft.ID.String()+"/send", nil)
	if resent.Code != http.StatusConflict {
		t.Fatalf("resend sent notification: code=%d body=%s", resent.Code, resent.Body.String())
	}

	inbox := performNotificationRequest(t, studentRouter, http.MethodGet, "/me/notifications", nil)
	if inbox.Code != http.StatusOK || !bytes.Contains(inbox.Body.Bytes(), []byte(`"title":"Assessment reminder"`)) || !bytes.Contains(inbox.Body.Bytes(), []byte(`"is_read":false`)) {
		t.Fatalf("student notification inbox: code=%d body=%s", inbox.Code, inbox.Body.String())
	}
	unread := performNotificationRequest(t, studentRouter, http.MethodGet, "/me/notifications/unread-count", nil)
	if unread.Code != http.StatusOK || !bytes.Contains(unread.Body.Bytes(), []byte(`"unread_count":1`)) {
		t.Fatalf("student unread count: code=%d body=%s", unread.Code, unread.Body.String())
	}
	read := performNotificationRequest(t, studentRouter, http.MethodPost, "/me/notifications/"+draft.ID.String()+"/read", nil)
	if read.Code != http.StatusOK {
		t.Fatalf("mark notification read: code=%d body=%s", read.Code, read.Body.String())
	}
	stats := performNotificationRequest(t, adminRouter, http.MethodGet, "/notifications/"+draft.ID.String()+"/stats", nil)
	if stats.Code != http.StatusOK || !bytes.Contains(stats.Body.Bytes(), []byte(`"total":3`)) || !bytes.Contains(stats.Body.Bytes(), []byte(`"read":1`)) {
		t.Fatalf("notification stats: code=%d body=%s", stats.Code, stats.Body.String())
	}

	archived := performNotificationRequest(t, studentRouter, http.MethodPost, "/me/notifications/"+draft.ID.String()+"/archive", nil)
	if archived.Code != http.StatusOK {
		t.Fatalf("archive notification: code=%d body=%s", archived.Code, archived.Body.String())
	}
	activeInbox := performNotificationRequest(t, studentRouter, http.MethodGet, "/me/notifications", nil)
	if activeInbox.Code != http.StatusOK || bytes.Contains(activeInbox.Body.Bytes(), []byte(draft.ID.String())) {
		t.Fatalf("archived notification remained active: code=%d body=%s", activeInbox.Code, activeInbox.Body.String())
	}
	archive := performNotificationRequest(t, studentRouter, http.MethodGet, "/me/notifications/archived", nil)
	if archive.Code != http.StatusOK || !bytes.Contains(archive.Body.Bytes(), []byte(draft.ID.String())) {
		t.Fatalf("archived notification list: code=%d body=%s", archive.Code, archive.Body.String())
	}
	unarchived := performNotificationRequest(t, studentRouter, http.MethodPost, "/me/notifications/"+draft.ID.String()+"/unarchive", nil)
	if unarchived.Code != http.StatusOK {
		t.Fatalf("unarchive notification: code=%d body=%s", unarchived.Code, unarchived.Body.String())
	}

	expect := func(router http.Handler, path string, want ...string) {
		t.Helper()
		res := performNotificationRequest(t, router, http.MethodGet, path, nil)
		for _, w := range want {
			if res.Code != http.StatusOK || !bytes.Contains(res.Body.Bytes(), []byte(w)) {
				t.Fatalf("GET %s: want %s, code=%d body=%s", path, w, res.Code, res.Body.String())
			}
		}
	}
	expect(studentRouter, "/me/notifications/inbox?box=read", `"total":1`, `"read":1`, `"unread":0`)
	expect(studentRouter, "/me/notifications/inbox?box=unread", `"items":[]`)
	expect(studentRouter, "/me/notifications/inbox?box=read&search=assessm", `"total":1`)
	expect(studentRouter, "/me/notifications/inbox?box=read&search=nothing-like-this", `"items":[]`)
	expect(adminRouter, "/notifications/history?search=assessm", `"total":1`, `"recipient_count":3`, `"read_count":1`)
	expect(adminRouter, "/notifications/history?category=sports", `"items":[]`)
	if bad := performNotificationRequest(t, studentRouter, http.MethodGet, "/me/notifications/inbox?box=spam", nil); bad.Code != http.StatusBadRequest {
		t.Fatalf("invalid box: code=%d", bad.Code)
	}
	if readAll := performNotificationRequest(t, studentRouter, http.MethodPost, "/me/notifications/read-all", nil); readAll.Code != http.StatusOK {
		t.Fatalf("read all: code=%d body=%s", readAll.Code, readAll.Body.String())
	}

	request.Title = "Disposable draft"
	deletedDraftResponse := performNotificationRequest(t, adminRouter, http.MethodPost, "/notifications", request)
	var deletedDraft NotificationResponse
	if err := json.Unmarshal(deletedDraftResponse.Body.Bytes(), &deletedDraft); err != nil {
		t.Fatal(err)
	}
	deleted := performNotificationRequest(t, adminRouter, http.MethodDelete, "/notifications/"+deletedDraft.ID.String(), nil)
	if deleted.Code != http.StatusOK {
		t.Fatalf("delete notification draft: code=%d body=%s", deleted.Code, deleted.Body.String())
	}
	assertNotificationMissing(t, pool, deletedDraft.ID)
}

func notificationRouter(service *NotificationService, userID uuid.UUID, role string) *gin.Engine {
	router := gin.New()
	group := router.Group("")
	group.Use(func(c *gin.Context) {
		c.Set("userID", userID.String())
		c.Set("roles", []string{role})
		c.Next()
	})
	RegisterRoutes(group, group, service)
	return router
}

func performNotificationRequest(t *testing.T, router http.Handler, method, path string, body any) *httptest.ResponseRecorder {
	t.Helper()
	var payload []byte
	if body != nil {
		var err error
		payload, err = json.Marshal(body)
		if err != nil {
			t.Fatal(err)
		}
	}
	request := httptest.NewRequest(method, path, bytes.NewReader(payload))
	if body != nil {
		request.Header.Set("Content-Type", "application/json")
	}
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	return response
}

func seedNotificationFixture(t *testing.T, pool *pgxpool.Pool) notificationFixture {
	t.Helper()
	ctx := context.Background()
	f := notificationFixture{adminUserID: uuid.New(), teacherUserID: uuid.New(), studentUserID: uuid.New(), guardianUserID: uuid.New()}
	users := []struct {
		id                uuid.UUID
		email, name, role string
	}{
		{f.adminUserID, "notification-admin@example.test", "Notification Admin", authz.RoleAdmin},
		{f.teacherUserID, "notification-teacher@example.test", "Notification Teacher", authz.RoleTeacher},
		{f.studentUserID, "notification-student@example.test", "Notification Student", authz.RoleStudent},
		{f.guardianUserID, "notification-parent@example.test", "Notification Parent", authz.RoleParent},
	}
	for _, user := range users {
		if _, err := pool.Exec(ctx, "INSERT INTO users (id, email, full_name, role) VALUES ($1, $2, $3, $4)", user.id, user.email, user.name, user.role); err != nil {
			t.Fatal(err)
		}
	}
	var teacherID, yearID, gradeID, studentID, guardianID uuid.UUID
	if err := pool.QueryRow(ctx, "INSERT INTO teacher_profiles (user_id, full_name, employee_number, joined_date, nic_number) VALUES ($1, 'Notification Teacher', 'NOTE-T-001', '2020-01-01', 'NOTE-NIC-T-001') RETURNING id", f.teacherUserID).Scan(&teacherID); err != nil {
		t.Fatal(err)
	}
	if err := pool.QueryRow(ctx, "INSERT INTO academic_years (label, start_date, end_date, is_current) VALUES ('2026 Notifications', '2026-01-01', '2026-12-31', TRUE) RETURNING id").Scan(&yearID); err != nil {
		t.Fatal(err)
	}
	if err := pool.QueryRow(ctx, "INSERT INTO grades (name, sort_order) VALUES ('Grade 8 Notifications', 8) RETURNING id").Scan(&gradeID); err != nil {
		t.Fatal(err)
	}
	if err := pool.QueryRow(ctx, "INSERT INTO classes (grade_id, academic_year_id, form_teacher_id, name) VALUES ($1, $2, $3, 'A') RETURNING id", gradeID, yearID, teacherID).Scan(&f.classID); err != nil {
		t.Fatal(err)
	}
	if err := pool.QueryRow(ctx, "INSERT INTO student_profiles (user_id, full_name, index_number) VALUES ($1, 'Notification Student', 'NOTE-S-001') RETURNING id", f.studentUserID).Scan(&studentID); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, "INSERT INTO class_students (class_id, student_id) VALUES ($1, $2)", f.classID, studentID); err != nil {
		t.Fatal(err)
	}
	if err := pool.QueryRow(ctx, "INSERT INTO guardians (user_id, full_name, relationship, phone, email, nic_number) VALUES ($1, 'Notification Parent', 'guardian', '0771000000', 'notification-parent@example.test', 'NOTE-NIC-G-001') RETURNING id", f.guardianUserID).Scan(&guardianID); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, "INSERT INTO student_guardians (student_id, guardian_id, is_primary_contact) VALUES ($1, $2, TRUE)", studentID, guardianID); err != nil {
		t.Fatal(err)
	}
	return f
}

func assertNotificationState(t *testing.T, pool *pgxpool.Pool, notificationID uuid.UUID, wantStatus string, wantRecipients int) {
	t.Helper()
	var status string
	if err := pool.QueryRow(context.Background(), "SELECT status FROM notifications WHERE id = $1", notificationID).Scan(&status); err != nil {
		t.Fatal(err)
	}
	var recipients int
	if err := pool.QueryRow(context.Background(), "SELECT COUNT(*) FROM notification_recipients WHERE notification_id = $1", notificationID).Scan(&recipients); err != nil {
		t.Fatal(err)
	}
	if status != wantStatus || recipients != wantRecipients {
		t.Fatalf("notification status=%q recipients=%d; want %q and %d", status, recipients, wantStatus, wantRecipients)
	}
}

func assertNotificationMissing(t *testing.T, pool *pgxpool.Pool, notificationID uuid.UUID) {
	t.Helper()
	var count int
	if err := pool.QueryRow(context.Background(), "SELECT COUNT(*) FROM notifications WHERE id = $1", notificationID).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 0 {
		t.Fatalf("notification %s still exists", notificationID)
	}
}
