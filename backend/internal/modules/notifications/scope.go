package notifications

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/authz"
)

// NotifyClass is a current-year class the sender may message.
type NotifyClass struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	GradeName   string    `json:"grade_name"`
	IsFormClass bool      `json:"is_form_class"`
}

// NotifySociety is a current-year society the sender may message.
type NotifySociety struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name"`
}

// NotifyScope tells the composer which audiences the sender may pick.
// Full is true for admins and the principal, who may reach everyone.
type NotifyScope struct {
	Full            bool            `json:"full"`
	Classes         []NotifyClass   `json:"classes"`
	Societies       []NotifySociety `json:"societies"`
	GradeIDs        []uuid.UUID     `json:"grade_ids"`
	GradeSectionIDs []uuid.UUID     `json:"grade_section_ids"`
}

// Scope works out the sender's audiences with the same checks used when sending.
func (s *NotificationService) Scope(ctx context.Context, callerUserID uuid.UUID, callerRole string) (NotifyScope, error) {
	scope := NotifyScope{Classes: []NotifyClass{}, Societies: []NotifySociety{}, GradeIDs: []uuid.UUID{}, GradeSectionIDs: []uuid.UUID{}}
	full := callerRole == authz.RoleAdmin
	var teacherID uuid.UUID
	if !full {
		if callerRole != authz.RoleTeacher {
			return scope, ErrForbiddenRecipients
		}
		id, err := s.repo.TeacherIDByUser(ctx, callerUserID)
		if err != nil {
			return scope, fmt.Errorf("no teacher profile linked to this account")
		}
		teacherID = id
		if full, err = s.repo.IsPrincipal(ctx, teacherID); err != nil {
			return scope, err
		}
	}
	if full {
		scope.Full = true
		societies, err := s.repo.ListNotifySocieties(ctx, nil)
		scope.Societies = orEmpty(societies)
		return scope, err
	}

	classes, err := s.repo.ListNotifyClasses(ctx, teacherID)
	if err != nil {
		return scope, err
	}
	societies, err := s.repo.ListNotifySocieties(ctx, &teacherID)
	if err != nil {
		return scope, err
	}
	grades, err := s.authorizedGradeIDs(ctx, teacherID)
	if err != nil {
		return scope, err
	}
	sections, err := s.authorizedSectionIDs(ctx, teacherID)
	if err != nil {
		return scope, err
	}
	scope.Classes, scope.Societies, scope.GradeIDs, scope.GradeSectionIDs = orEmpty(classes), orEmpty(societies), grades, sections
	return scope, nil
}

func orEmpty[T any](rows []T) []T {
	if rows == nil {
		return []T{}
	}
	return rows
}

// authorizedGradeIDs lists the grades the teacher heads as TIC, section head or vice principal.
func (s *NotificationService) authorizedGradeIDs(ctx context.Context, teacherID uuid.UUID) ([]uuid.UUID, error) {
	all, err := s.repo.ListAllGradeIDs(ctx)
	if err != nil {
		return nil, err
	}
	out := []uuid.UUID{}
	for _, gradeID := range all {
		ok, err := s.isTeacherAuthorizedForGrade(ctx, teacherID, gradeID)
		if err != nil {
			return nil, err
		}
		if ok {
			out = append(out, gradeID)
		}
	}
	return out, nil
}

// authorizedSectionIDs lists current-year grade sections whose every grade the teacher heads.
func (s *NotificationService) authorizedSectionIDs(ctx context.Context, teacherID uuid.UUID) ([]uuid.UUID, error) {
	yearID, err := s.currentAcademicYearID(ctx)
	if err != nil {
		return nil, err
	}
	sections, err := s.repo.ListGradeSectionIDs(ctx, yearID)
	if err != nil {
		return nil, err
	}
	out := []uuid.UUID{}
	for _, sectionID := range sections {
		id := sectionID
		if s.checkGradeRule(ctx, teacherID, RecipientRule{Type: RuleGradeSection, GradeSectionID: &id}) == nil {
			out = append(out, sectionID)
		}
	}
	return out, nil
}

// checkSocietyRule lets only the society's teacher in charge message its members.
func (s *NotificationService) checkSocietyRule(ctx context.Context, teacherID uuid.UUID, rule RecipientRule) error {
	if rule.SocietyID == nil || !validAudience(rule.Audience) {
		return ErrForbiddenRecipients
	}
	return allowed(s.repo.IsTeacherInChargeOfSociety(ctx, *rule.SocietyID, teacherID))
}

func validAudience(a Audience) bool {
	return a == "" || a == AudienceAll || a == AudienceMembers || a == AudienceGuardians
}

// addClassAudience adds the whole class, or only its students or only their guardians.
func (s *NotificationService) addClassAudience(ctx context.Context, classID uuid.UUID, audience Audience, set *recipientSet) error {
	switch audience {
	case AudienceMembers:
		ids, err := s.repo.ListStudentUserIDsByClass(ctx, classID)
		set.addPg(ids...)
		return err
	case AudienceGuardians:
		ids, err := s.repo.ListGuardianUserIDsByClass(ctx, classID)
		set.addPg(ids...)
		return err
	default:
		return s.addClass(ctx, classID, set)
	}
}

// addSociety adds the society's members, their guardians, or both.
func (s *NotificationService) addSociety(ctx context.Context, rule RecipientRule, set *recipientSet) error {
	if rule.SocietyID == nil {
		return nil
	}
	if rule.Audience != AudienceGuardians {
		ids, err := s.repo.ListStudentUserIDsBySociety(ctx, *rule.SocietyID)
		if err != nil {
			return err
		}
		set.addPg(ids...)
	}
	if rule.Audience == AudienceGuardians || rule.Audience == AudienceAll {
		ids, err := s.repo.ListGuardianUserIDsBySociety(ctx, *rule.SocietyID)
		if err != nil {
			return err
		}
		set.addPg(ids...)
	}
	return nil
}
