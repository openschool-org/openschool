package notifications

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/openschool-org/openschool/internal/authz"
)

var ruleSocietyMine, ruleSocietyOther = nid(700), nid(701)

func (s *ruleStore) ListAllGradeIDs(context.Context) ([]uuid.UUID, error) {
	return []uuid.UUID{ruleGradeMine, ruleGradeOther}, nil
}
func (s *ruleStore) ListGradeSectionIDs(context.Context, uuid.UUID) ([]uuid.UUID, error) {
	return []uuid.UUID{ruleSection}, nil
}
func (s *ruleStore) IsTeacherInChargeOfSociety(_ context.Context, society, _ uuid.UUID) (bool, error) {
	return society == ruleSocietyMine, nil
}
func (s *ruleStore) ListStudentUserIDsBySociety(context.Context, uuid.UUID) ([]pgtype.UUID, error) {
	return []pgtype.UUID{pgUUID(nid(7100))}, nil
}
func (s *ruleStore) ListGuardianUserIDsBySociety(context.Context, uuid.UUID) ([]pgtype.UUID, error) {
	return []pgtype.UUID{pgUUID(nid(7200))}, nil
}
func (s *ruleStore) ListNotifyClasses(context.Context, uuid.UUID) ([]NotifyClass, error) {
	return []NotifyClass{{ID: ruleClassMine, Name: "13-M1", IsFormClass: true}}, nil
}
func (s *ruleStore) ListNotifySocieties(_ context.Context, teacher *uuid.UUID) ([]NotifySociety, error) {
	if teacher == nil {
		return []NotifySociety{{ID: ruleSocietyMine}, {ID: ruleSocietyOther}}, nil
	}
	return []NotifySociety{{ID: ruleSocietyMine}}, nil
}

func TestPlainClassTeacherRules(t *testing.T) {
	cases := []struct {
		name    string
		rule    RecipientRule
		allowed bool
	}{
		{"own class students", RecipientRule{Type: RuleClass, ClassID: ptr(ruleClassMine), Audience: AudienceMembers}, true},
		{"own class guardians", RecipientRule{Type: RuleClass, ClassID: ptr(ruleClassMine), Audience: AudienceGuardians}, true},
		{"own class unknown audience", RecipientRule{Type: RuleClass, ClassID: ptr(ruleClassMine), Audience: "teachers"}, false},
		{"grade", RecipientRule{Type: RuleGrade, GradeID: ptr(ruleGradeMine)}, false},
		{"section", RecipientRule{Type: RuleGradeSection, GradeSectionID: ptr(ruleSection)}, false},
		{"subject across the school", RecipientRule{Type: RuleSubject, SubjectID: ptr(ruleSubjectMine), SubjectAudience: AudienceStudents}, false},
		{"own society", RecipientRule{Type: RuleSociety, SocietyID: ptr(ruleSocietyMine)}, true},
		{"own society guardians", RecipientRule{Type: RuleSociety, SocietyID: ptr(ruleSocietyMine), Audience: AudienceGuardians}, true},
		{"other society", RecipientRule{Type: RuleSociety, SocietyID: ptr(ruleSocietyOther)}, false},
		{"society without id", RecipientRule{Type: RuleSociety}, false},
		{"any teacher", RecipientRule{Type: RuleTeacher, TeacherID: ptr(ruleColleague)}, true},
	}
	service := NewNotificationService(&ruleStore{headsNothing: true})
	for _, tc := range cases {
		err := service.authorizeSender(context.Background(), authz.RoleTeacher, ruleTeacherUser, []RecipientRule{tc.rule})
		if tc.allowed && err != nil {
			t.Errorf("%s: want allowed, got %v", tc.name, err)
		}
		if !tc.allowed && !errors.Is(err, ErrForbiddenRecipients) {
			t.Errorf("%s: want forbidden, got %v", tc.name, err)
		}
	}
}

func TestClassAndSocietyAudiences(t *testing.T) {
	service := NewNotificationService(&ruleStore{})
	cases := map[string]struct {
		rule RecipientRule
		want string
	}{
		"class students":   {RecipientRule{Type: RuleClass, ClassID: ptr(ruleClassMine), Audience: AudienceMembers}, "[00000000-0000-0000-0000-000000002000]"},
		"class guardians":  {RecipientRule{Type: RuleClass, ClassID: ptr(ruleClassMine), Audience: AudienceGuardians}, "[00000000-0000-0000-0000-000000003000]"},
		"society students": {RecipientRule{Type: RuleSociety, SocietyID: ptr(ruleSocietyMine)}, "[00000000-0000-0000-0000-000000007100]"},
		"society guardians": {RecipientRule{Type: RuleSociety, SocietyID: ptr(ruleSocietyMine), Audience: AudienceGuardians},
			"[00000000-0000-0000-0000-000000007200]"},
		"society both": {RecipientRule{Type: RuleSociety, SocietyID: ptr(ruleSocietyMine), Audience: AudienceAll},
			"[00000000-0000-0000-0000-000000007100 00000000-0000-0000-0000-000000007200]"},
	}
	for name, tc := range cases {
		got, err := service.resolveRecipientUserIDs(context.Background(), []RecipientRule{tc.rule})
		if err != nil {
			t.Fatal(err)
		}
		if fmt.Sprint(got) != tc.want {
			t.Errorf("%s: got %v want %s", name, got, tc.want)
		}
	}
}

func TestScope(t *testing.T) {
	ctx := context.Background()
	plain, err := NewNotificationService(&ruleStore{headsNothing: true}).Scope(ctx, ruleTeacherUser, authz.RoleTeacher)
	if err != nil {
		t.Fatal(err)
	}
	if plain.Full || len(plain.GradeIDs) != 0 || len(plain.GradeSectionIDs) != 0 || len(plain.Classes) != 1 || len(plain.Societies) != 1 {
		t.Errorf("plain teacher scope: %+v", plain)
	}
	head, err := NewNotificationService(&ruleStore{}).Scope(ctx, ruleTeacherUser, authz.RoleTeacher)
	if err != nil {
		t.Fatal(err)
	}
	// Heads grade 200 only, so the section holding 200 and 201 stays out.
	if len(head.GradeIDs) != 1 || head.GradeIDs[0] != ruleGradeMine || len(head.GradeSectionIDs) != 0 {
		t.Errorf("grade head scope: %+v", head)
	}
	admin, err := NewNotificationService(&ruleStore{}).Scope(ctx, nid(99), authz.RoleAdmin)
	if err != nil || !admin.Full || len(admin.Societies) != 2 {
		t.Errorf("admin scope: %+v %v", admin, err)
	}
	if _, err := NewNotificationService(&ruleStore{}).Scope(ctx, nid(99), authz.RoleStudent); !errors.Is(err, ErrForbiddenRecipients) {
		t.Errorf("student scope: %v", err)
	}
}
