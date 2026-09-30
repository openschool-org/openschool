// Package leadership owns school leadership appointments, section heads,
// teacher rank resolution, and leadership-scoped overview access.
package leadership

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/openschool-org/openschool/internal/ports"
)

var (
	ErrPositionNotFound    = errors.New("position assignment not found")
	ErrSectionHeadNotFound = errors.New("section head assignment not found")
	ErrInsufficientRank    = errors.New("this action requires a leadership position (Principal, Vice Principal, or Section Head)")
)

type Position struct {
	ID                uuid.UUID          `json:"id"`
	TeacherID         uuid.UUID          `json:"teacher_id"`
	Position          string             `json:"position"`
	NotifyWholeSchool bool               `json:"notify_whole_school"`
	ScopeNote         pgtype.Text        `json:"scope_note"`
	CreatedAt         pgtype.Timestamptz `json:"created_at"`
}

type PositionListItem struct {
	Position
	TeacherName string `json:"teacher_name"`
}

type SectionHead struct {
	ID             uuid.UUID          `json:"id"`
	AcademicYearID uuid.UUID          `json:"academic_year_id"`
	GradeID        uuid.UUID          `json:"grade_id"`
	StreamID       pgtype.UUID        `json:"stream_id"`
	TeacherID      uuid.UUID          `json:"teacher_id"`
	CreatedAt      pgtype.Timestamptz `json:"created_at"`
}

type SectionHeadListItem struct {
	SectionHead
	GradeName   string      `json:"grade_name"`
	StreamName  pgtype.Text `json:"stream_name"`
	TeacherName string      `json:"teacher_name"`
}

type scopeGrade struct {
	ID   uuid.UUID
	Name string
}

type overviewCounts struct {
	ClassCount          int64
	StudentCount        int64
	SessionsMarkedToday int64
}

type store interface {
	upsertPrincipal(context.Context, uuid.UUID) (Position, error)
	upsertVicePrincipal(context.Context, uuid.UUID, bool) (Position, error)
	replaceVicePrincipalScopes(context.Context, uuid.UUID, []uuid.UUID) error
	listPositions(context.Context) ([]PositionListItem, error)
	getPositionForTeacher(context.Context, uuid.UUID) (Position, error)
	listVicePrincipalScopeGrades(context.Context, uuid.UUID) ([]scopeGrade, error)
	deletePosition(context.Context, uuid.UUID) (int64, error)
	deletePositionByTeacherAndType(context.Context, uuid.UUID, string) error
	isPrincipal(context.Context, uuid.UUID) (bool, error)
	isFormTeacher(context.Context, uuid.UUID, uuid.UUID) (bool, error)
	isSubjectTeacher(context.Context, uuid.UUID, uuid.UUID) (bool, error)
	leadershipOverviewCounts(context.Context, []uuid.UUID) (overviewCounts, error)
	leadershipOverviewGradeNames(context.Context, []uuid.UUID) ([]string, error)
	upsertGradeSectionHead(context.Context, uuid.UUID, uuid.UUID, uuid.UUID) (SectionHead, error)
	upsertStreamSectionHead(context.Context, uuid.UUID, uuid.UUID, uuid.UUID, uuid.UUID) (SectionHead, error)
	listSectionHeads(context.Context, uuid.UUID) ([]SectionHeadListItem, error)
	deleteSectionHead(context.Context, uuid.UUID) (int64, error)
	listGradeIDsHeadedByTeacher(context.Context, uuid.UUID, uuid.UUID) ([]uuid.UUID, error)
	teacherClassAccess(ctx context.Context, userID, classID uuid.UUID) (classAccess, error)
	currentClassOfStudent(context.Context, uuid.UUID) (uuid.UUID, error)
}

type Service struct {
	store store
	audit ports.AuditRecorder
}

func NewService(store store, audit ports.AuditRecorder) *Service {
	return &Service{store: store, audit: audit}
}

func (s *Service) AssignPrincipal(ctx context.Context, req AssignPrincipalRequest, actorID uuid.UUID) (Position, error) {
	teacherID, err := uuid.Parse(req.TeacherID)
	if err != nil {
		return Position{}, fmt.Errorf("invalid teacher id")
	}
	position, err := s.store.upsertPrincipal(ctx, teacherID)
	if err != nil {
		return Position{}, err
	}
	if err := s.store.deletePositionByTeacherAndType(ctx, teacherID, "vice_principal"); err != nil {
		return Position{}, err
	}
	if s.audit != nil {
		_ = s.audit.Record(ctx, "teacher_position", teacherID, "assigned_principal", actorID, nil, position, "")
	}
	return position, nil
}

func (s *Service) AssignVicePrincipal(ctx context.Context, req AssignVicePrincipalRequest, actorID uuid.UUID) (Position, error) {
	teacherID, err := uuid.Parse(req.TeacherID)
	if err != nil {
		return Position{}, fmt.Errorf("invalid teacher id")
	}
	position, err := s.store.upsertVicePrincipal(ctx, teacherID, req.NotifyWholeSchool)
	if err != nil {
		return Position{}, err
	}
	gradeIDs := make([]uuid.UUID, 0, len(req.GradeIDs))
	if !req.NotifyWholeSchool {
		for _, raw := range req.GradeIDs {
			gradeID, err := uuid.Parse(raw)
			if err != nil {
				return Position{}, fmt.Errorf("invalid grade id: %s", raw)
			}
			gradeIDs = append(gradeIDs, gradeID)
		}
	}
	if err := s.store.replaceVicePrincipalScopes(ctx, position.ID, gradeIDs); err != nil {
		return Position{}, err
	}
	if s.audit != nil {
		_ = s.audit.Record(ctx, "teacher_position", teacherID, "assigned_vice_principal", actorID, nil, struct {
			Position Position    `json:"position"`
			GradeIDs []uuid.UUID `json:"grade_ids"`
		}{position, gradeIDs}, "")
	}
	return position, nil
}

func (s *Service) ListPositions(ctx context.Context) ([]PositionListItem, error) {
	return s.store.listPositions(ctx)
}

func (s *Service) DeletePosition(ctx context.Context, id, actorID uuid.UUID) error {
	count, err := s.store.deletePosition(ctx, id)
	if err != nil {
		return err
	}
	if count == 0 {
		return ErrPositionNotFound
	}
	if s.audit != nil {
		_ = s.audit.Record(ctx, "teacher_position", id, "removed", actorID, nil, nil, "")
	}
	return nil
}

func (s *Service) AssignSectionHead(ctx context.Context, req AssignSectionHeadRequest) (SectionHead, error) {
	yearID, err := uuid.Parse(req.AcademicYearID)
	if err != nil {
		return SectionHead{}, fmt.Errorf("invalid academic year id")
	}
	gradeID, err := uuid.Parse(req.GradeID)
	if err != nil {
		return SectionHead{}, fmt.Errorf("invalid grade id")
	}
	teacherID, err := uuid.Parse(req.TeacherID)
	if err != nil {
		return SectionHead{}, fmt.Errorf("invalid teacher id")
	}
	if req.StreamID != nil && *req.StreamID != "" {
		streamID, err := uuid.Parse(*req.StreamID)
		if err != nil {
			return SectionHead{}, fmt.Errorf("invalid stream id")
		}
		return s.store.upsertStreamSectionHead(ctx, yearID, gradeID, streamID, teacherID)
	}
	return s.store.upsertGradeSectionHead(ctx, yearID, gradeID, teacherID)
}

func (s *Service) ListSectionHeads(ctx context.Context, academicYearID uuid.UUID) ([]SectionHeadListItem, error) {
	return s.store.listSectionHeads(ctx, academicYearID)
}

func (s *Service) DeleteSectionHead(ctx context.Context, id uuid.UUID) error {
	count, err := s.store.deleteSectionHead(ctx, id)
	if err != nil {
		return err
	}
	if count == 0 {
		return ErrSectionHeadNotFound
	}
	return nil
}

type PositionRank int

const (
	RankPrincipal PositionRank = iota + 1
	RankVicePrincipal
	RankSectionHead
	RankClassTeacher
	RankSubjectTeacher
	RankTeacher
)

func (r PositionRank) IsPrincipalOrVicePrincipal() bool {
	return r == RankPrincipal || r == RankVicePrincipal
}

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

type PositionSummary struct {
	Rank              PositionRank `json:"rank"`
	RankLabel         string       `json:"rank_label"`
	NotifyWholeSchool bool         `json:"notify_whole_school"`
}

func (s *Service) SummaryForTeacher(ctx context.Context, teacherID, academicYearID uuid.UUID) (PositionSummary, error) {
	rank, position, err := s.RankForTeacher(ctx, teacherID, academicYearID)
	if err != nil {
		return PositionSummary{}, err
	}
	return PositionSummary{Rank: rank, RankLabel: rank.RankLabel(), NotifyWholeSchool: rank == RankPrincipal || rank == RankVicePrincipal && position.NotifyWholeSchool}, nil
}

func (s *Service) RankForTeacher(ctx context.Context, teacherID, academicYearID uuid.UUID) (PositionRank, Position, error) {
	isPrincipal, err := s.store.isPrincipal(ctx, teacherID)
	if err != nil {
		return 0, Position{}, err
	}
	if isPrincipal {
		return RankPrincipal, Position{}, nil
	}
	position, err := s.store.getPositionForTeacher(ctx, teacherID)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return 0, Position{}, err
	}
	if err == nil && position.Position == "vice_principal" {
		return RankVicePrincipal, position, nil
	}
	headedGrades, err := s.store.listGradeIDsHeadedByTeacher(ctx, teacherID, academicYearID)
	if err != nil {
		return 0, Position{}, err
	}
	if len(headedGrades) > 0 {
		return RankSectionHead, Position{}, nil
	}
	isFormTeacher, err := s.store.isFormTeacher(ctx, teacherID, academicYearID)
	if err != nil {
		return 0, Position{}, err
	}
	if isFormTeacher {
		return RankClassTeacher, Position{}, nil
	}
	isSubjectTeacher, err := s.store.isSubjectTeacher(ctx, teacherID, academicYearID)
	if err != nil {
		return 0, Position{}, err
	}
	if isSubjectTeacher {
		return RankSubjectTeacher, Position{}, nil
	}
	return RankTeacher, Position{}, nil
}

func (s *Service) LeadershipScope(ctx context.Context, teacherID, academicYearID uuid.UUID) (bool, []uuid.UUID, error) {
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
		rows, err := s.store.listVicePrincipalScopeGrades(ctx, position.ID)
		if err != nil {
			return false, nil, err
		}
		ids := make([]uuid.UUID, len(rows))
		for i, row := range rows {
			ids[i] = row.ID
		}
		return false, ids, nil
	case RankSectionHead:
		gradeIDs, err := s.store.listGradeIDsHeadedByTeacher(ctx, teacherID, academicYearID)
		return false, gradeIDs, err
	default:
		return false, nil, ErrInsufficientRank
	}
}

type LeadershipOverviewSummary struct {
	Scope                string   `json:"scope"`
	GradeNames           []string `json:"grade_names"`
	ClassCount           int64    `json:"class_count"`
	StudentCount         int64    `json:"student_count"`
	SessionsMarkedToday  int64    `json:"sessions_marked_today"`
	SessionsPendingToday int64    `json:"sessions_pending_today"`
}

func (s *Service) LeadershipOverview(ctx context.Context, teacherID, academicYearID uuid.UUID) (LeadershipOverviewSummary, error) {
	wholeSchool, gradeIDs, err := s.LeadershipScope(ctx, teacherID, academicYearID)
	if err != nil {
		return LeadershipOverviewSummary{}, err
	}
	scope := "grades"
	queryGradeIDs := gradeIDs
	if wholeSchool {
		scope = "school"
		queryGradeIDs = nil
	}
	counts, err := s.store.leadershipOverviewCounts(ctx, queryGradeIDs)
	if err != nil {
		return LeadershipOverviewSummary{}, err
	}
	var gradeNames []string
	if !wholeSchool {
		if len(gradeIDs) == 0 {
			return LeadershipOverviewSummary{Scope: scope, GradeNames: []string{}}, nil
		}
		gradeNames, err = s.store.leadershipOverviewGradeNames(ctx, gradeIDs)
		if err != nil {
			return LeadershipOverviewSummary{}, err
		}
	}
	return LeadershipOverviewSummary{Scope: scope, GradeNames: gradeNames, ClassCount: counts.ClassCount, StudentCount: counts.StudentCount, SessionsMarkedToday: counts.SessionsMarkedToday, SessionsPendingToday: counts.ClassCount - counts.SessionsMarkedToday}, nil
}
