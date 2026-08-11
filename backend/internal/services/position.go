package services

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/repositories"
)

var ErrPositionNotFound = errors.New("position assignment not found")

type PositionService struct {
	repo            *repositories.PositionRepository
	sectionHeadRepo *repositories.SectionHeadRepository
}

func NewPositionService(repo *repositories.PositionRepository, sectionHeadRepo *repositories.SectionHeadRepository) *PositionService {
	return &PositionService{repo: repo, sectionHeadRepo: sectionHeadRepo}
}

// AssignPrincipal replaces the school's Principal — a permanent appointment,
// not renewed per academic year. If the new Principal was previously a Vice
// Principal, that row is cleared (they can't hold both at once, and being
// promoted to Principal supersedes it).
func (s *PositionService) AssignPrincipal(ctx context.Context, req models.AssignPrincipalRequest) (db.TeacherPosition, error) {
	teacherID, err := uuid.Parse(req.TeacherID)
	if err != nil {
		return db.TeacherPosition{}, fmt.Errorf("invalid teacher id")
	}

	position, err := s.repo.UpsertPrincipal(ctx, teacherID)
	if err != nil {
		return db.TeacherPosition{}, err
	}

	if err := s.repo.DeleteByTeacherAndPosition(ctx, teacherID, "vice_principal"); err != nil {
		return db.TeacherPosition{}, err
	}

	return position, nil
}

func (s *PositionService) AssignVicePrincipal(ctx context.Context, req models.AssignVicePrincipalRequest) (db.TeacherPosition, error) {
	teacherID, err := uuid.Parse(req.TeacherID)
	if err != nil {
		return db.TeacherPosition{}, fmt.Errorf("invalid teacher id")
	}

	position, err := s.repo.UpsertVicePrincipal(ctx, db.UpsertVicePrincipalParams{
		TeacherID:         teacherID,
		NotifyWholeSchool: req.NotifyWholeSchool,
		ScopeNote:         pgtype.Text{},
	})
	if err != nil {
		return db.TeacherPosition{}, err
	}

	gradeIDs := make([]uuid.UUID, 0, len(req.GradeIDs))
	if !req.NotifyWholeSchool {
		for _, raw := range req.GradeIDs {
			gradeID, err := uuid.Parse(raw)
			if err != nil {
				return db.TeacherPosition{}, fmt.Errorf("invalid grade id: %s", raw)
			}
			gradeIDs = append(gradeIDs, gradeID)
		}
	}
	if err := s.repo.ReplaceVicePrincipalScopes(ctx, position.ID, gradeIDs); err != nil {
		return db.TeacherPosition{}, err
	}

	return position, nil
}

func (s *PositionService) List(ctx context.Context) ([]db.ListTeacherPositionsRow, error) {
	return s.repo.List(ctx)
}

func (s *PositionService) ListVicePrincipalScopeGrades(ctx context.Context, positionID uuid.UUID) ([]db.ListVicePrincipalScopeGradesRow, error) {
	return s.repo.ListVicePrincipalScopeGrades(ctx, positionID)
}

func (s *PositionService) Delete(ctx context.Context, id uuid.UUID) error {
	n, err := s.repo.Delete(ctx, id)
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrPositionNotFound
	}
	return nil
}

// IsPrincipal and IsVicePrincipalAuthorizedForGrade are exposed directly for
// notification.go's authorizeSender to call — see notification.go's
// Principal-bypass and Vice-Principal-grade-authorization checks.
func (s *PositionService) IsPrincipal(ctx context.Context, teacherID uuid.UUID) (bool, error) {
	return s.repo.IsPrincipal(ctx, teacherID)
}

func (s *PositionService) IsVicePrincipalAuthorizedForGrade(ctx context.Context, teacherID, gradeID uuid.UUID) (bool, error) {
	return s.repo.IsVicePrincipalAuthorizedForGrade(ctx, teacherID, gradeID)
}

// PositionRank is a hierarchy ordinal, lower value outranks higher — Phase
// 4.2's "does A outrank B is a single integer comparison" rank, layered over
// the existing separate mechanisms (teacher_positions, section_heads,
// classes.form_teacher_id, class_subject_teachers) rather than a new stored
// column.
type PositionRank int

const (
	RankPrincipal PositionRank = iota + 1
	RankVicePrincipal
	RankSectionHead
	RankClassTeacher   // classes.form_teacher_id
	RankSubjectTeacher // class_subject_teachers assignment
	RankTeacher        // default — no leadership position held
)

// RankLabel returns a human-readable name for display (dashboards, badges).
func (r PositionRank) RankLabel() string {
	switch r {
	case RankPrincipal:
		return "Principal"
	case RankVicePrincipal:
		return "Vice Principal"
	case RankSectionHead:
		return "Section Head"
	case RankClassTeacher:
		return "Class Teacher"
	case RankSubjectTeacher:
		return "Subject Teacher"
	default:
		return "Teacher"
	}
}

// PositionSummary is what a teacher's own dashboard needs to render
// role-appropriate content and know their notification reach.
type PositionSummary struct {
	Rank              PositionRank `json:"rank"`
	RankLabel         string       `json:"rank_label"`
	NotifyWholeSchool bool         `json:"notify_whole_school"`
}

// SummaryForTeacher computes RankForTeacher plus whether this teacher can
// notify the whole school (true for Principal, or a Vice Principal with
// notify_whole_school granted) — used by GET /me/teacher/position.
func (s *PositionService) SummaryForTeacher(ctx context.Context, teacherID, academicYearID uuid.UUID) (PositionSummary, error) {
	rank, vicePrincipalPosition, err := s.RankForTeacher(ctx, teacherID, academicYearID)
	if err != nil {
		return PositionSummary{}, err
	}

	notifyWholeSchool := rank == RankPrincipal
	if rank == RankVicePrincipal {
		notifyWholeSchool = vicePrincipalPosition.NotifyWholeSchool
	}

	return PositionSummary{
		Rank:              rank,
		RankLabel:         rank.RankLabel(),
		NotifyWholeSchool: notifyWholeSchool,
	}, nil
}

// RankForTeacher computes a teacher's highest-ranking position by checking
// each mechanism in hierarchy order and stopping at the first match.
// Principal/Vice Principal are permanent (not year-scoped); Section
// Head/Class Teacher/Subject Teacher are checked for the given academic
// year since those assignments legitimately change every year. The second
// return value is only meaningful when rank is RankVicePrincipal — it's the
// row SummaryForTeacher would otherwise have to re-fetch to read
// NotifyWholeSchool off of.
func (s *PositionService) RankForTeacher(ctx context.Context, teacherID, academicYearID uuid.UUID) (PositionRank, db.TeacherPosition, error) {
	isPrincipal, err := s.repo.IsPrincipal(ctx, teacherID)
	if err != nil {
		return 0, db.TeacherPosition{}, err
	}
	if isPrincipal {
		return RankPrincipal, db.TeacherPosition{}, nil
	}

	position, err := s.repo.GetForTeacher(ctx, teacherID)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return 0, db.TeacherPosition{}, err
	}
	if err == nil && position.Position == "vice_principal" {
		return RankVicePrincipal, position, nil
	}

	headedGrades, err := s.sectionHeadRepo.ListGradeIDsHeadedByTeacher(ctx, teacherID, academicYearID)
	if err != nil {
		return 0, db.TeacherPosition{}, err
	}
	if len(headedGrades) > 0 {
		return RankSectionHead, db.TeacherPosition{}, nil
	}

	isFormTeacher, err := s.repo.IsFormTeacherOfAnyClass(ctx, teacherID, academicYearID)
	if err != nil {
		return 0, db.TeacherPosition{}, err
	}
	if isFormTeacher {
		return RankClassTeacher, db.TeacherPosition{}, nil
	}

	isSubjectTeacher, err := s.repo.IsSubjectTeacherOfAnyClass(ctx, teacherID, academicYearID)
	if err != nil {
		return 0, db.TeacherPosition{}, err
	}
	if isSubjectTeacher {
		return RankSubjectTeacher, db.TeacherPosition{}, nil
	}

	return RankTeacher, db.TeacherPosition{}, nil
}
