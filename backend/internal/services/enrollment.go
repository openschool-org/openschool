package services

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/repositories"
)

var (
	ErrLevelHasNoGroups  = errors.New("level has no selection groups configured")
	ErrEnrollmentInvalid = errors.New("enrollment picks failed validation")
)

type EnrollmentService struct {
	repo       *repositories.EnrollmentRepository
	curriculum *repositories.CurriculumRepository
}

func NewEnrollmentService(repo *repositories.EnrollmentRepository, curriculum *repositories.CurriculumRepository) *EnrollmentService {
	return &EnrollmentService{repo: repo, curriculum: curriculum}
}

// Validate checks a proposed set of picks against every group of a level.
// It reports one error per offending group rather than failing on the first.
func (s *EnrollmentService) Validate(ctx context.Context, levelID uuid.UUID, picks []models.EnrollmentPick) ([]models.GroupValidationError, error) {
	groups, err := s.curriculum.ListSelectionGroupsWithSubjectIDsByLevel(ctx, levelID)
	if err != nil {
		return nil, err
	}
	if len(groups) == 0 {
		return nil, ErrLevelHasNoGroups
	}

	belongsToLevel := make(map[uuid.UUID]bool, len(groups))
	for _, g := range groups {
		belongsToLevel[g.GroupID] = true
	}

	var errs []models.GroupValidationError

	// bucket the picks by group, rejecting any that name a group outside this level
	chosen := make(map[uuid.UUID][]uuid.UUID)
	for _, p := range picks {
		groupID, err := uuid.Parse(p.GroupID)
		if err != nil {
			return nil, fmt.Errorf("invalid group_id %q", p.GroupID)
		}
		subjectID, err := uuid.Parse(p.SubjectID)
		if err != nil {
			return nil, fmt.Errorf("invalid subject_id %q", p.SubjectID)
		}
		if !belongsToLevel[groupID] {
			errs = append(errs, models.GroupValidationError{
				GroupID: groupID.String(),
				Message: "group does not belong to this level",
			})
			continue
		}
		chosen[groupID] = append(chosen[groupID], subjectID)
	}

	for _, g := range groups {
		allowed := make(map[uuid.UUID]bool, len(g.SubjectIds))
		for _, id := range g.SubjectIds {
			allowed[id] = true
		}

		seen := make(map[uuid.UUID]bool)
		valid := 0

		for _, subjectID := range chosen[g.GroupID] {
			switch {
			case seen[subjectID]:
				errs = append(errs, models.GroupValidationError{
					GroupID: g.GroupID.String(),
					Label:   g.GroupLabel,
					Message: fmt.Sprintf("subject %s selected more than once", subjectID),
				})
			case !allowed[subjectID]:
				errs = append(errs, models.GroupValidationError{
					GroupID: g.GroupID.String(),
					Label:   g.GroupLabel,
					Message: fmt.Sprintf("subject %s is not an option in this group", subjectID),
				})
			default:
				valid++
			}
			seen[subjectID] = true
		}

		count := int32(valid)
		if count < g.MinSelect || count > g.MaxSelect {
			errs = append(errs, models.GroupValidationError{
				GroupID: g.GroupID.String(),
				Label:   g.GroupLabel,
				Message: expectationMessage(g.MinSelect, g.MaxSelect, count),
			})
		}
	}

	return errs, nil
}

// expectationMessage renders "expected 1 subject, got 0" style feedback.
func expectationMessage(min, max, got int32) string {
	if min == max {
		return fmt.Sprintf("expected %d %s, got %d", min, pluralSubjects(min), got)
	}
	return fmt.Sprintf("expected between %d and %d subjects, got %d", min, max, got)
}

func pluralSubjects(n int32) string {
	if n == 1 {
		return "subject"
	}
	return "subjects"
}

// Submit validates the picks and, only if every group passes, replaces the
// student's existing picks for that level and academic year.
func (s *EnrollmentService) Submit(ctx context.Context, studentID uuid.UUID, req models.SubmitEnrollmentRequest) ([]models.GroupValidationError, error) {
	academicYearID, err := uuid.Parse(req.AcademicYearID)
	if err != nil {
		return nil, errors.New("invalid academic_year_id")
	}
	levelID, err := uuid.Parse(req.LevelID)
	if err != nil {
		return nil, errors.New("invalid level_id")
	}

	validationErrs, err := s.Validate(ctx, levelID, req.Picks)
	if err != nil {
		return nil, err
	}
	if len(validationErrs) > 0 {
		return validationErrs, ErrEnrollmentInvalid
	}

	params := make([]db.CreateStudentSubjectEnrollmentParams, 0, len(req.Picks))
	for _, p := range req.Picks {
		groupID, err := uuid.Parse(p.GroupID)
		if err != nil {
			return nil, errors.New("invalid group_id")
		}
		subjectID, err := uuid.Parse(p.SubjectID)
		if err != nil {
			return nil, errors.New("invalid subject_id")
		}
		mediumID, err := parseOptionalUUID(p.MediumID)
		if err != nil {
			return nil, errors.New("invalid medium_id")
		}

		params = append(params, db.CreateStudentSubjectEnrollmentParams{
			StudentID:      studentID,
			AcademicYearID: academicYearID,
			GroupID:        groupID,
			SubjectID:      subjectID,
			MediumID:       mediumID,
		})
	}

	err = s.repo.ReplaceForLevel(ctx, db.DeleteStudentEnrollmentsForLevelParams{
		StudentID:      studentID,
		AcademicYearID: academicYearID,
		LevelID:        levelID,
	}, params)
	if err != nil {
		return nil, err
	}

	return nil, nil
}

// ── reads ───────────────────────────────────────────────────────────────────

func (s *EnrollmentService) ListByStudent(ctx context.Context, studentID, academicYearID uuid.UUID) ([]models.EnrollmentResponse, error) {
	rows, err := s.repo.ListByStudent(ctx, db.ListStudentEnrollmentsParams{
		StudentID:      studentID,
		AcademicYearID: academicYearID,
	})
	if err != nil {
		return nil, err
	}

	resp := make([]models.EnrollmentResponse, len(rows))
	for i, r := range rows {
		resp[i] = models.EnrollmentResponse{
			StudentID:      r.StudentID.String(),
			AcademicYearID: r.AcademicYearID.String(),
			GroupID:        r.GroupID.String(),
			GroupLabel:     r.GroupLabel,
			LevelID:        r.LevelID.String(),
			LevelLabel:     r.LevelLabel,
			SubjectID:      r.SubjectID.String(),
			SubjectName:    r.SubjectName,
			SubjectCode:    r.SubjectCode,
			SubjectType:    textString(r.SubjectType),
			MediumID:       uuidString(r.MediumID),
			MediumName:     textString(r.MediumName),
			EnrolledAt:     r.EnrolledAt.Time.String(),
		}
	}
	return resp, nil
}

func (s *EnrollmentService) Delete(ctx context.Context, studentID, academicYearID, groupID, subjectID uuid.UUID) error {
	return s.repo.Delete(ctx, db.DeleteStudentSubjectEnrollmentParams{
		StudentID:      studentID,
		AcademicYearID: academicYearID,
		GroupID:        groupID,
		SubjectID:      subjectID,
	})
}

func (s *EnrollmentService) ListStudentsBySubject(ctx context.Context, subjectID, academicYearID uuid.UUID) ([]models.EnrolledStudentResponse, error) {
	rows, err := s.repo.ListStudentsBySubject(ctx, db.ListStudentsBySubjectParams{
		SubjectID:      subjectID,
		AcademicYearID: academicYearID,
	})
	if err != nil {
		return nil, err
	}

	resp := make([]models.EnrolledStudentResponse, len(rows))
	for i, r := range rows {
		groupID := r.GroupID.String()
		groupLabel := r.GroupLabel
		resp[i] = models.EnrolledStudentResponse{
			StudentID:   r.StudentID.String(),
			FullName:    r.FullName,
			IndexNumber: r.IndexNumber,
			GroupID:     &groupID,
			GroupLabel:  &groupLabel,
			MediumID:    uuidString(r.MediumID),
			MediumName:  textString(r.MediumName),
			EnrolledAt:  r.EnrolledAt.Time.String(),
		}
	}
	return resp, nil
}

func (s *EnrollmentService) ListStudentsByGroup(ctx context.Context, groupID, academicYearID uuid.UUID) ([]models.EnrolledStudentResponse, error) {
	rows, err := s.repo.ListStudentsByGroup(ctx, db.ListStudentsByGroupParams{
		GroupID:        groupID,
		AcademicYearID: academicYearID,
	})
	if err != nil {
		return nil, err
	}

	resp := make([]models.EnrolledStudentResponse, len(rows))
	for i, r := range rows {
		subjectID := r.SubjectID.String()
		subjectName := r.SubjectName
		subjectCode := r.SubjectCode
		resp[i] = models.EnrolledStudentResponse{
			StudentID:   r.StudentID.String(),
			FullName:    r.FullName,
			IndexNumber: r.IndexNumber,
			SubjectID:   &subjectID,
			SubjectName: &subjectName,
			SubjectCode: &subjectCode,
			MediumID:    uuidString(r.MediumID),
			MediumName:  textString(r.MediumName),
			EnrolledAt:  r.EnrolledAt.Time.String(),
		}
	}
	return resp, nil
}
