package notifications

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/openschool-org/openschool/internal/authz"
)

func nid(n int) uuid.UUID { return uuid.MustParse(fmt.Sprintf("00000000-0000-0000-0000-%012d", n)) }

// ruleStore is a fixed school: teacher 1 (user 11) teaches class 100 and subject 300, heads grade 200;
// grade section 250 holds grades 200 and 201; class 101 is in grade 201.
type ruleStore struct {
	store
	principal bool
	// headsNothing turns teacher 1 into a plain class teacher with no grade authority.
	headsNothing bool
}

var (
	ruleYear, ruleTeacher, ruleTeacherUser = nid(9), nid(1), nid(11)
	ruleClassMine, ruleClassOther          = nid(100), nid(101)
	ruleGradeMine, ruleGradeOther          = nid(200), nid(201)
	ruleSection                            = nid(250)
	ruleSubjectMine, ruleSubjectOther      = nid(300), nid(301)
	ruleStudentMine, ruleStudentOther      = nid(400), nid(401)
	ruleGuardianMine, ruleGuardianOther    = nid(500), nid(501)
	ruleColleague                          = nid(2)
)

func (s *ruleStore) ListAllUserIDs(context.Context) ([]uuid.UUID, error) {
	return []uuid.UUID{nid(1001), nid(1002)}, nil
}
func (s *ruleStore) ListStudentUserIDsByClass(_ context.Context, c uuid.UUID) ([]pgtype.UUID, error) {
	return []pgtype.UUID{pgUUID(nid(2000 + int(c[15]))), {}}, nil
}
func (s *ruleStore) ListGuardianUserIDsByClass(_ context.Context, c uuid.UUID) ([]pgtype.UUID, error) {
	return []pgtype.UUID{pgUUID(nid(3000 + int(c[15])))}, nil
}
func (s *ruleStore) ListTeacherUserIDsByClass(context.Context, uuid.UUID) ([]uuid.UUID, error) {
	return []uuid.UUID{ruleTeacherUser}, nil
}
func (s *ruleStore) ListClassIDsByGrade(_ context.Context, g, _ uuid.UUID) ([]uuid.UUID, error) {
	if g == ruleGradeMine {
		return []uuid.UUID{ruleClassMine}, nil
	}
	return []uuid.UUID{ruleClassOther}, nil
}
func (s *ruleStore) ListTeacherUserIDsBySubject(context.Context, uuid.UUID) ([]uuid.UUID, error) {
	return []uuid.UUID{ruleTeacherUser, nid(12)}, nil
}
func (s *ruleStore) ListStudentUserIDsBySubject(context.Context, uuid.UUID, uuid.UUID) ([]pgtype.UUID, error) {
	return []pgtype.UUID{pgUUID(nid(2100))}, nil
}
func (s *ruleStore) ListStudentIDsByGuardian(_ context.Context, g uuid.UUID) ([]uuid.UUID, error) {
	if g == ruleGuardianMine {
		return []uuid.UUID{ruleStudentMine}, nil
	}
	return []uuid.UUID{ruleStudentOther}, nil
}
func (s *ruleStore) IsTeacherAssignedToSubject(_ context.Context, _, subject uuid.UUID) (bool, error) {
	return subject == ruleSubjectMine, nil
}
func (s *ruleStore) CurrentAcademicYearID(context.Context) (uuid.UUID, error) { return ruleYear, nil }
func (s *ruleStore) ListGradeIDs(context.Context, uuid.UUID) ([]uuid.UUID, error) {
	return []uuid.UUID{ruleGradeMine, ruleGradeOther}, nil
}
func (s *ruleStore) GetGradeTIC(_ context.Context, _, grade uuid.UUID) (uuid.UUID, error) {
	if grade == ruleGradeMine && !s.headsNothing {
		return ruleTeacher, nil
	}
	return uuid.Nil, pgx.ErrNoRows
}
func (s *ruleStore) GetGradeSectionHead(context.Context, uuid.UUID, uuid.UUID) (pgtype.UUID, error) {
	return pgtype.UUID{}, pgx.ErrNoRows
}
func (s *ruleStore) IsVicePrincipalAuthorizedForGrade(context.Context, uuid.UUID, uuid.UUID) (bool, error) {
	return false, nil
}
func (s *ruleStore) TeacherIDByUser(_ context.Context, u uuid.UUID) (uuid.UUID, error) {
	if u == ruleTeacherUser {
		return ruleTeacher, nil
	}
	return uuid.Nil, pgx.ErrNoRows
}
func (s *ruleStore) IsPrincipal(context.Context, uuid.UUID) (bool, error) { return s.principal, nil }
func (s *ruleStore) IsTeacherAssignedToClass(_ context.Context, class, _ uuid.UUID) (bool, error) {
	return class == ruleClassMine, nil
}
func (s *ruleStore) StudentCurrentClass(_ context.Context, st uuid.UUID) (uuid.UUID, error) {
	if st == ruleStudentMine {
		return ruleClassMine, nil
	}
	return ruleClassOther, nil
}
func (s *ruleStore) IsTeacherAssignedToAnyStudentClass(_ context.Context, students []uuid.UUID, _ uuid.UUID) (bool, error) {
	return len(students) == 1 && students[0] == ruleStudentMine, nil
}
func (s *ruleStore) StudentUserID(_ context.Context, st uuid.UUID) (pgtype.UUID, error) {
	return pgUUID(nid(4000 + int(st[15]))), nil
}
func (s *ruleStore) GuardianUserID(_ context.Context, g uuid.UUID) (pgtype.UUID, error) {
	return pgUUID(nid(5000 + int(g[15]))), nil
}
func (s *ruleStore) TeacherUserID(_ context.Context, t uuid.UUID) (uuid.UUID, error) {
	return nid(6000 + int(t[15])), nil
}

func ptr(id uuid.UUID) *uuid.UUID { return &id }

func TestAuthorizeSenderRules(t *testing.T) {
	cases := []struct {
		name    string
		rule    RecipientRule
		allowed bool
	}{
		{"everyone", RecipientRule{Type: RuleEveryone}, false},
		{"own class", RecipientRule{Type: RuleClass, ClassID: ptr(ruleClassMine)}, true},
		{"other class", RecipientRule{Type: RuleClass, ClassID: ptr(ruleClassOther)}, false},
		{"class without id", RecipientRule{Type: RuleClass}, false},
		{"headed grade", RecipientRule{Type: RuleGrade, GradeID: ptr(ruleGradeMine)}, true},
		{"other grade", RecipientRule{Type: RuleGrade, GradeID: ptr(ruleGradeOther)}, false},
		{"grade without id", RecipientRule{Type: RuleGrade}, false},
		{"section with an unheaded grade", RecipientRule{Type: RuleGradeSection, GradeSectionID: ptr(ruleSection)}, false},
		{"own subject students", RecipientRule{Type: RuleSubject, SubjectID: ptr(ruleSubjectMine), SubjectAudience: AudienceStudents}, true},
		{"own subject teachers", RecipientRule{Type: RuleSubject, SubjectID: ptr(ruleSubjectMine), SubjectAudience: AudienceTeachers}, false},
		{"other subject", RecipientRule{Type: RuleSubject, SubjectID: ptr(ruleSubjectOther), SubjectAudience: AudienceStudents}, false},
		{"own student", RecipientRule{Type: RuleStudent, StudentID: ptr(ruleStudentMine)}, true},
		{"other student", RecipientRule{Type: RuleStudent, StudentID: ptr(ruleStudentOther)}, false},
		{"own guardian", RecipientRule{Type: RuleGuardian, GuardianID: ptr(ruleGuardianMine)}, true},
		{"other guardian", RecipientRule{Type: RuleGuardian, GuardianID: ptr(ruleGuardianOther)}, false},
		{"colleague", RecipientRule{Type: RuleTeacher, TeacherID: ptr(ruleColleague)}, true},
	}
	service := NewNotificationService(&ruleStore{})
	for _, tc := range cases {
		err := service.authorizeSender(context.Background(), authz.RoleTeacher, ruleTeacherUser, []RecipientRule{tc.rule})
		if tc.allowed && err != nil {
			t.Errorf("%s: want allowed, got %v", tc.name, err)
		}
		if !tc.allowed && !errors.Is(err, ErrForbiddenRecipients) {
			t.Errorf("%s: want forbidden, got %v", tc.name, err)
		}
	}

	if err := service.authorizeSender(context.Background(), authz.RoleTeacher, ruleTeacherUser, []RecipientRule{{Type: "bogus"}}); err == nil || errors.Is(err, ErrForbiddenRecipients) {
		t.Errorf("unknown rule: got %v", err)
	}
	if err := service.authorizeSender(context.Background(), authz.RoleTeacher, nid(99), nil); err == nil {
		t.Error("teacher without a profile must be refused")
	}
	if err := service.authorizeSender(context.Background(), authz.RoleAdmin, nid(99), []RecipientRule{{Type: RuleEveryone}}); err != nil {
		t.Errorf("admin: %v", err)
	}
	principal := NewNotificationService(&ruleStore{principal: true})
	if err := principal.authorizeSender(context.Background(), authz.RoleTeacher, ruleTeacherUser, []RecipientRule{{Type: RuleEveryone}}); err != nil {
		t.Errorf("principal: %v", err)
	}
}

func TestResolveRecipientRules(t *testing.T) {
	service := NewNotificationService(&ruleStore{})
	rules := []RecipientRule{
		{Type: RuleClass, ClassID: ptr(ruleClassMine)},
		{Type: RuleClass},
		{Type: RuleGrade, GradeID: ptr(ruleGradeOther)},
		{Type: RuleGradeSection, GradeSectionID: ptr(ruleSection)},
		{Type: RuleSubject, SubjectID: ptr(ruleSubjectMine), SubjectAudience: AudienceTeachers},
		{Type: RuleSubject, SubjectID: ptr(ruleSubjectMine), SubjectAudience: AudienceStudents},
		{Type: RuleStudent, StudentID: ptr(ruleStudentMine)},
		{Type: RuleGuardian, GuardianID: ptr(ruleGuardianMine)},
		{Type: RuleTeacher, TeacherID: ptr(ruleColleague)},
		{Type: RuleEveryone},
	}
	got, err := service.resolveRecipientUserIDs(context.Background(), rules)
	if err != nil {
		t.Fatal(err)
	}
	gotStr := fmt.Sprint(got)
	const expected = "[00000000-0000-0000-0000-000000002000 00000000-0000-0000-0000-000000003000 00000000-0000-0000-0000-000000000011 00000000-0000-0000-0000-000000002001 00000000-0000-0000-0000-000000003001 00000000-0000-0000-0000-000000000012 00000000-0000-0000-0000-000000002100 00000000-0000-0000-0000-000000004000 00000000-0000-0000-0000-000000005000 00000000-0000-0000-0000-000000006002 00000000-0000-0000-0000-000000001001 00000000-0000-0000-0000-000000001002]"
	if gotStr != expected {
		t.Fatalf("recipients changed:\n got %s\nwant %s", gotStr, expected)
	}
}
