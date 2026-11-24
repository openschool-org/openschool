package studentleadership

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/openschool-org/openschool/internal/authz"
)

type studentLeadershipStore struct {
	store
	society          Society
	societyErr       error
	teacherID        uuid.UUID
	teacherErr       error
	member           SocietyMember
	memberSocietyID  uuid.UUID
	memberStudentID  uuid.UUID
	memberYearID     uuid.UUID
	removedSocietyID uuid.UUID
	removedMemberID  uuid.UUID
	removeCount      int64
	leftReason       string
	prefect          Prefect
	prefectYearID    uuid.UUID
	prefectStudentID uuid.UUID
	prefectRank      string
}

func (s *studentLeadershipStore) getSociety(context.Context, uuid.UUID) (Society, error) {
	return s.society, s.societyErr
}

func (s *studentLeadershipStore) teacherIDByUser(context.Context, uuid.UUID) (uuid.UUID, error) {
	return s.teacherID, s.teacherErr
}

func (s *studentLeadershipStore) upsertSocietyMember(_ context.Context, societyID, studentID uuid.UUID, _ string, yearID uuid.UUID) (SocietyMember, error) {
	s.memberSocietyID, s.memberStudentID, s.memberYearID = societyID, studentID, yearID
	return s.member, nil
}

func (s *studentLeadershipStore) deactivateSocietyMember(_ context.Context, societyID, memberID uuid.UUID, reason string) (int64, error) {
	s.removedSocietyID, s.removedMemberID, s.leftReason = societyID, memberID, reason
	return s.removeCount, nil
}

func (s *studentLeadershipStore) upsertPrefect(_ context.Context, yearID, studentID uuid.UUID, rank string) (Prefect, error) {
	s.prefectYearID, s.prefectStudentID, s.prefectRank = yearID, studentID, rank
	return s.prefect, nil
}

func TestAssignPrefectParsesAndPassesAppointment(t *testing.T) {
	store := &studentLeadershipStore{prefect: Prefect{ID: uuid.New()}}
	yearID, studentID := uuid.New(), uuid.New()
	result, err := NewService(store).AssignPrefect(context.Background(), AssignPrefectRequest{
		AcademicYearID: yearID.String(), StudentID: studentID.String(), Rank: "head",
	})
	if err != nil {
		t.Fatal(err)
	}
	if result.ID != store.prefect.ID || store.prefectYearID != yearID || store.prefectStudentID != studentID || store.prefectRank != "head" {
		t.Fatalf("unexpected appointment: result=%#v year=%s student=%s rank=%s", result, store.prefectYearID, store.prefectStudentID, store.prefectRank)
	}
}

func TestAssignSocietyMemberUsesAuthoritativeSocietyYear(t *testing.T) {
	societyID, yearID, teacherID, userID, studentID := uuid.New(), uuid.New(), uuid.New(), uuid.New(), uuid.New()
	store := &studentLeadershipStore{
		society:   Society{ID: societyID, AcademicYearID: yearID, TeacherInChargeID: teacherID},
		teacherID: teacherID,
		member:    SocietyMember{ID: uuid.New()},
	}
	result, err := NewService(store).AssignSocietyMember(context.Background(), Actor{ID: userID, Role: authz.RoleTeacher}, societyID, AssignSocietyMemberRequest{StudentID: studentID.String(), Role: "leader"})
	if err != nil {
		t.Fatal(err)
	}
	if result.ID != store.member.ID || store.memberSocietyID != societyID || store.memberStudentID != studentID || store.memberYearID != yearID {
		t.Fatalf("unexpected membership: result=%#v society=%s student=%s year=%s", result, store.memberSocietyID, store.memberStudentID, store.memberYearID)
	}
}

func TestAdminCanManageSocietyWithoutTeacherProfile(t *testing.T) {
	societyID := uuid.New()
	store := &studentLeadershipStore{society: Society{ID: societyID, AcademicYearID: uuid.New()}, teacherErr: errors.New("teacher lookup must not run")}
	_, err := NewService(store).AssignSocietyMember(context.Background(), Actor{ID: uuid.New(), Role: authz.RoleAdmin}, societyID, AssignSocietyMemberRequest{StudentID: uuid.NewString(), Role: "member"})
	if err != nil {
		t.Fatal(err)
	}
}

func TestTeacherCannotManageAnotherSociety(t *testing.T) {
	store := &studentLeadershipStore{society: Society{TeacherInChargeID: uuid.New()}, teacherID: uuid.New()}
	_, err := NewService(store).AssignSocietyMember(context.Background(), Actor{ID: uuid.New(), Role: authz.RoleTeacher}, uuid.New(), AssignSocietyMemberRequest{StudentID: uuid.NewString(), Role: "member"})
	if !errors.Is(err, ErrNotTeacherInCharge) {
		t.Fatalf("error=%v, want ErrNotTeacherInCharge", err)
	}
}

func TestMissingSocietyMapsToDomainError(t *testing.T) {
	store := &studentLeadershipStore{societyErr: pgx.ErrNoRows}
	_, err := NewService(store).AssignSocietyMember(context.Background(), Actor{Role: authz.RoleAdmin}, uuid.New(), AssignSocietyMemberRequest{StudentID: uuid.NewString(), Role: "member"})
	if !errors.Is(err, ErrSocietyNotFound) {
		t.Fatalf("error=%v, want ErrSocietyNotFound", err)
	}
}

func TestDeactivateMemberIsScopedToSociety(t *testing.T) {
	societyID, memberID := uuid.New(), uuid.New()
	store := &studentLeadershipStore{society: Society{ID: societyID}, removeCount: 1}
	if err := NewService(store).DeactivateSocietyMember(context.Background(), Actor{Role: authz.RoleAdmin}, societyID, memberID, "  Left the school  "); err != nil {
		t.Fatal(err)
	}
	if store.removedSocietyID != societyID || store.removedMemberID != memberID {
		t.Fatalf("deactivate was not scoped correctly: society=%s member=%s", store.removedSocietyID, store.removedMemberID)
	}
	if store.leftReason != "Left the school" {
		t.Fatalf("reason = %q, want it trimmed", store.leftReason)
	}
}

func TestDeactivateMemberAlreadyInactive(t *testing.T) {
	store := &studentLeadershipStore{society: Society{ID: uuid.New()}, removeCount: 0}
	err := NewService(store).DeactivateSocietyMember(context.Background(), Actor{Role: authz.RoleAdmin}, uuid.New(), uuid.New(), "")
	if !errors.Is(err, ErrSocietyMemberNotFound) {
		t.Fatalf("error=%v, want ErrSocietyMemberNotFound", err)
	}
}
