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
	audit           *AuditService
}

func NewPositionService(repo *repositories.PositionRepository, sectionHeadRepo *repositories.SectionHeadRepository, audit *AuditService) *PositionService {
	return &PositionService{repo: repo, sectionHeadRepo: sectionHeadRepo, audit: audit}
}

// AssignPrincipal replaces the school's Principal — a permanent appointment, not renewed per academic year; if the new Principal was previously Vice Principal, that row is cleared since they can't hold both at once.
func (s *PositionService) AssignPrincipal(ctx context.Context, req models.AssignPrincipalRequest, actorID uuid.UUID) (db.TeacherPosition, error) {
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

	if s.audit != nil {
		_ = s.audit.Record(ctx, "teacher_position", teacherID, "assigned_principal", actorID, nil, position, "")
	}

	return position, nil
}

func (s *PositionService) AssignVicePrincipal(ctx context.Context, req models.AssignVicePrincipalRequest, actorID uuid.UUID) (db.TeacherPosition, error) {
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

	if s.audit != nil {
		_ = s.audit.Record(ctx, "teacher_position", teacherID, "assigned_vice_principal", actorID, nil,
			struct {
				Position db.TeacherPosition `json:"position"`
				GradeIDs []uuid.UUID        `json:"grade_ids"`
			}{position, gradeIDs}, "")
	}

	return position, nil
}

func (s *PositionService) List(ctx context.Context) ([]db.ListTeacherPositionsRow, error) {
	return s.repo.List(ctx)
}

func (s *PositionService) Delete(ctx context.Context, id uuid.UUID, actorID uuid.UUID) error {
	n, err := s.repo.Delete(ctx, id)
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrPositionNotFound
	}
	if s.audit != nil {
		_ = s.audit.Record(ctx, "teacher_position", id, "removed", actorID, nil, nil, "")
	}
	return nil
}

// PositionRank is a hierarchy ordinal (lower value outranks higher), layered over the existing separate mechanisms (teacher_positions, section_heads, classes.form_teacher_id, class_subject_teachers) rather than a new stored column.
type PositionRank int

const (
	RankPrincipal PositionRank = iota + 1
	RankVicePrincipal
	RankSectionHead
	RankClassTeacher   // classes.form_teacher_id
	RankSubjectTeacher // class_subject_teachers assignment
	RankTeacher        // default — no leadership position held
)

// IsPrincipalOrVicePrincipal is true for the two permanent school-leadership
// ranks — used to gate the whole-school "monitor" views (analytics, every
// class's timetable) that Section Head and below don't get.
func (r PositionRank) IsPrincipalOrVicePrincipal() bool {
	return r == RankPrincipal || r == RankVicePrincipal
}

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

// SummaryForTeacher computes RankForTeacher plus whether this teacher can notify the whole school (Principal, or a Vice Principal with notify_whole_school granted) — used by GET /me/teacher/position.
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

// RankForTeacher computes a teacher's highest-ranking position by checking each mechanism in hierarchy order and stopping at the first match; the second return value is only meaningful when rank is RankVicePrincipal (the row SummaryForTeacher would otherwise re-fetch for NotifyWholeSchool).
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

// ErrInsufficientRank is returned by LeadershipScope when the teacher holds no leadership position — callers use this to distinguish "not authorized at all" from a genuine lookup failure.
var ErrInsufficientRank = errors.New("this action requires a leadership position (Principal, Vice Principal, or Section Head)")

// LeadershipScope resolves what a leadership-ranked teacher is authorized to see school-wide: whole-school access, or a specific set of grade IDs (scoped Vice Principal, or a Section Head's headed grades). Returns ErrInsufficientRank for anyone below Section Head.
func (s *PositionService) LeadershipScope(ctx context.Context, teacherID, academicYearID uuid.UUID) (wholeSchool bool, gradeIDs []uuid.UUID, err error) {
	rank, position, err := s.RankForTeacher(ctx, teacherID, academicYearID)
	if err != nil {
		return false, nil, err
	}

	switch rank {
	case RankPrincipal:
		return true, nil, nil
	case RankVicePrincipal:
		if position.NotifyWholeSchool {
			return true, nil, nil
		}
		rows, err := s.repo.ListVicePrincipalScopeGrades(ctx, position.ID)
		if err != nil {
			return false, nil, err
		}
		ids := make([]uuid.UUID, len(rows))
		for i, row := range rows {
			ids[i] = row.ID
		}
		return false, ids, nil
	case RankSectionHead:
		headedGrades, err := s.sectionHeadRepo.ListGradeIDsHeadedByTeacher(ctx, teacherID, academicYearID)
		if err != nil {
			return false, nil, err
		}
		return false, headedGrades, nil
	default:
		return false, nil, ErrInsufficientRank
	}
}

// LeadershipOverviewSummary is the "School/Grades Overview" panel — real, scoped data for Principal/Vice Principal/Section Head; a plain Class/Subject Teacher gets ErrInsufficientRank, not empty data.
type LeadershipOverviewSummary struct {
	Scope                string   `json:"scope"` // "school" or "grades"
	GradeNames           []string `json:"grade_names"`
	ClassCount           int64    `json:"class_count"`
	StudentCount         int64    `json:"student_count"`
	SessionsMarkedToday  int64    `json:"sessions_marked_today"`
	SessionsPendingToday int64    `json:"sessions_pending_today"`
}

func (s *PositionService) LeadershipOverview(ctx context.Context, teacherID, academicYearID uuid.UUID) (LeadershipOverviewSummary, error) {
	wholeSchool, gradeIDs, err := s.LeadershipScope(ctx, teacherID, academicYearID)
	if err != nil {
		return LeadershipOverviewSummary{}, err
	}

	var queryGradeIDs []uuid.UUID
	scope := "grades"
	if wholeSchool {
		scope = "school"
		queryGradeIDs = nil
	} else {
		queryGradeIDs = gradeIDs
	}

	counts, err := s.repo.LeadershipOverviewCounts(ctx, queryGradeIDs)
	if err != nil {
		return LeadershipOverviewSummary{}, err
	}

	var gradeNames []string
	if !wholeSchool {
		if len(gradeIDs) == 0 {
			return LeadershipOverviewSummary{
				Scope:      scope,
				GradeNames: []string{},
			}, nil
		}
		gradeNames, err = s.repo.LeadershipOverviewGradeNames(ctx, gradeIDs)
		if err != nil {
			return LeadershipOverviewSummary{}, err
		}
	}

	return LeadershipOverviewSummary{
		Scope:                scope,
		GradeNames:           gradeNames,
		ClassCount:           counts.ClassCount,
		StudentCount:         counts.StudentCount,
		SessionsMarkedToday:  counts.SessionsMarkedToday,
		SessionsPendingToday: counts.ClassCount - counts.SessionsMarkedToday,
	}, nil
}
