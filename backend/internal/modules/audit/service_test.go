package audit

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type fakeStore struct {
	command createCommand
	rows    []row
	total   int64
}

func (f *fakeStore) create(_ context.Context, command createCommand) error {
	f.command = command
	return nil
}
func (f *fakeStore) list(context.Context, ListFilter) ([]row, int64, error) {
	return f.rows, f.total, nil
}
func (f *fakeStore) entityTypes(context.Context) ([]string, error) { return nil, nil }

func TestRecordSerializesStateAndOptionalFields(t *testing.T) {
	store := &fakeStore{}
	actorID := uuid.New()
	before := struct {
		Status string `json:"status"`
	}{Status: "old"}
	if err := NewService(store).Record(context.Background(), "student", uuid.New(), "updated", actorID, before, nil, "verified"); err != nil {
		t.Fatal(err)
	}
	if !store.command.ActorID.Valid || uuid.UUID(store.command.ActorID.Bytes) != actorID {
		t.Fatalf("actor was not preserved: %#v", store.command.ActorID)
	}
	if !store.command.Reason.Valid || store.command.Reason.String != "verified" {
		t.Fatalf("reason was not preserved: %#v", store.command.Reason)
	}
	var decoded map[string]string
	if err := json.Unmarshal(store.command.Before, &decoded); err != nil {
		t.Fatal(err)
	}
	if decoded["status"] != "old" || store.command.After != nil {
		t.Fatalf("unexpected audit state: before=%s after=%s", store.command.Before, store.command.After)
	}
}

func TestRecordTreatsSystemActorAsNullable(t *testing.T) {
	store := &fakeStore{}
	if err := NewService(store).Record(context.Background(), "job", uuid.New(), "ran", uuid.Nil, nil, nil, ""); err != nil {
		t.Fatal(err)
	}
	if store.command.ActorID.Valid || store.command.Reason.Valid {
		t.Fatalf("expected nullable actor and reason: %#v", store.command)
	}
}

func TestListMapsNullableActorAndReason(t *testing.T) {
	actorID := uuid.New()
	created := time.Date(2026, 9, 14, 12, 0, 0, 0, time.UTC)
	store := &fakeStore{rows: []row{{ID: uuid.New(), EntityType: "attendance_record", EntityID: uuid.New(), Action: "edited_after_lock", ActorID: pgtype.UUID{Bytes: actorID, Valid: true}, ActorName: pgtype.Text{String: "Admin User", Valid: true}, Reason: pgtype.Text{String: "correction", Valid: true}, CreatedAt: pgtype.Timestamptz{Time: created, Valid: true}}}, total: 1}
	logs, total, err := NewService(store).List(context.Background(), ListFilter{Limit: 25})
	if err != nil {
		t.Fatal(err)
	}
	if total != 1 {
		t.Fatalf("total = %d, want 1", total)
	}
	if len(logs) != 1 || logs[0].ActorID == nil || *logs[0].ActorID != actorID || logs[0].ActorName == nil || *logs[0].ActorName != "Admin User" || logs[0].Reason == nil || *logs[0].Reason != "correction" {
		t.Fatalf("unexpected response: %#v", logs)
	}
	if logs[0].CreatedAt != "2026-09-14T12:00:00Z" {
		t.Fatalf("unexpected timestamp: %s", logs[0].CreatedAt)
	}
}
