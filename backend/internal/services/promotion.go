package services

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/repositories"
)

var ErrCommitTargetClassMismatch = errors.New("one or more target classes do not belong to the target academic year")

type PromotionService struct {
	repo *repositories.PromotionRepository
}

func NewPromotionService(repo *repositories.PromotionRepository) *PromotionService {
	return &PromotionService{repo: repo}
}

// Preview computes, without writing anything, each actively-enrolled
// student's next grade and a non-binding suggested target class in
// targetYearID (same-name carryover, e.g. "6A" -> "7A"). Students at the
// top grade have no next grade and are flagged Graduating instead. When
// rankByTermID is set, each row also carries that term's total marks as a
// manual-distribution sort aid.
func (s *PromotionService) Preview(ctx context.Context, sourceYearID, targetYearID uuid.UUID, rankByTermID *uuid.UUID) ([]models.PromotionPreviewRow, error) {
	students, err := s.repo.ListActiveStudentsForYear(ctx, sourceYearID)
	if err != nil {
		return nil, fmt.Errorf("failed to list students for source year: %w", err)
	}

	// Memoize per-grade "next grade" lookups and per (grade, class-name)
	// suggestion lookups — many students share the same current grade/class,
	// so this keeps the query count proportional to distinct grades/classes,
	// not to student count.
	nextGradeCache := map[uuid.UUID]*db.Grade{}
	suggestionCache := map[string]*db.Class{}

	rows := make([]models.PromotionPreviewRow, 0, len(students))
	studentIDs := make([]uuid.UUID, 0, len(students))

	for _, st := range students {
		row := models.PromotionPreviewRow{
			StudentID:        st.StudentID.String(),
			StudentName:      st.StudentName,
			StudentIndex:     st.StudentIndex,
			CurrentClassID:   st.ClassID.String(),
			CurrentClassName: st.ClassName,
			CurrentGradeID:   st.GradeID.String(),
			CurrentGradeName: st.GradeName,
		}

		if st.MediumID.Valid {
			mediumID := uuid.UUID(st.MediumID.Bytes).String()
			row.MediumLocked = true
			row.CurrentMediumID = &mediumID
			if st.MediumName.Valid {
				name := st.MediumName.String
				row.CurrentMediumName = &name
			}
		}

		nextGrade, cached := nextGradeCache[st.GradeID]
		if !cached {
			g, err := s.repo.GetNextGrade(ctx, st.GradeID)
			if err != nil {
				if !errors.Is(err, pgx.ErrNoRows) {
					return nil, fmt.Errorf("failed to resolve next grade: %w", err)
				}
				nextGradeCache[st.GradeID] = nil
			} else {
				nextGradeCache[st.GradeID] = &g
			}
			nextGrade = nextGradeCache[st.GradeID]
		}

		if nextGrade == nil {
			row.Graduating = true
			rows = append(rows, row)
			studentIDs = append(studentIDs, st.StudentID)
			continue
		}

		nextGradeID := nextGrade.ID.String()
		nextGradeName := nextGrade.Name
		row.NextGradeID = &nextGradeID
		row.NextGradeName = &nextGradeName

		// A medium-locked student carries over by language of instruction,
		// not by class name — "6 English" should land in whatever the grade 7
		// English section is called. Undesignated classes keep the original
		// same-name carryover.
		suggestionKey := nextGrade.ID.String() + "|name|" + st.ClassName
		if row.MediumLocked {
			suggestionKey = nextGrade.ID.String() + "|medium|" + *row.CurrentMediumID
		}

		suggested, cached := suggestionCache[suggestionKey]
		if !cached {
			var (
				c   db.Class
				err error
			)
			if row.MediumLocked {
				c, err = s.repo.FindClassByGradeAndMedium(ctx, nextGrade.ID, targetYearID, st.MediumID)
			} else {
				c, err = s.repo.FindClassByGradeAndName(ctx, nextGrade.ID, targetYearID, st.ClassName)
			}
			if err != nil {
				if !errors.Is(err, pgx.ErrNoRows) {
					return nil, fmt.Errorf("failed to resolve suggested class: %w", err)
				}
				suggestionCache[suggestionKey] = nil
			} else {
				suggestionCache[suggestionKey] = &c
			}
			suggested = suggestionCache[suggestionKey]
		}
		if suggested != nil {
			suggestedID := suggested.ID.String()
			suggestedName := suggested.Name
			row.SuggestedClassID = &suggestedID
			row.SuggestedClassName = &suggestedName
		}

		rows = append(rows, row)
		studentIDs = append(studentIDs, st.StudentID)
	}

	if rankByTermID != nil {
		marks, err := s.repo.ListStudentTotalMarksForTerm(ctx, *rankByTermID, studentIDs)
		if err != nil {
			return nil, fmt.Errorf("failed to load marks: %w", err)
		}
		byStudent := make(map[uuid.UUID]struct{ total, max float64 }, len(marks))
		for _, m := range marks {
			byStudent[m.StudentID] = struct{ total, max float64 }{m.TotalMarks, m.TotalMaxMarks}
		}
		for i := range rows {
			id, err := uuid.Parse(rows[i].StudentID)
			if err != nil {
				continue
			}
			if v, ok := byStudent[id]; ok {
				total, max := v.total, v.max
				rows[i].TotalMarks = &total
				rows[i].TotalMaxMarks = &max
			}
		}
	}

	return rows, nil
}

// CommitAssignments validates every target class actually belongs to the
// target academic year, then bulk-writes the assignments in one batched
// UNNEST call — shared by both promotion-commit and general
// reassignment/shuffle.
func (s *PromotionService) CommitAssignments(ctx context.Context, req models.CommitAssignmentsRequest) (int, error) {
	yearID, err := uuid.Parse(req.AcademicYearID)
	if err != nil {
		return 0, fmt.Errorf("invalid academic year id")
	}

	studentIDs := make([]uuid.UUID, 0, len(req.Assignments))
	classIDs := make([]uuid.UUID, 0, len(req.Assignments))
	distinctClassIDs := make(map[uuid.UUID]bool)
	for _, a := range req.Assignments {
		studentID, err := uuid.Parse(a.StudentID)
		if err != nil {
			return 0, fmt.Errorf("invalid student id: %s", a.StudentID)
		}
		classID, err := uuid.Parse(a.ClassID)
		if err != nil {
			return 0, fmt.Errorf("invalid class id: %s", a.ClassID)
		}
		studentIDs = append(studentIDs, studentID)
		classIDs = append(classIDs, classID)
		distinctClassIDs[classID] = true
	}

	uniqueClassIDs := make([]uuid.UUID, 0, len(distinctClassIDs))
	for id := range distinctClassIDs {
		uniqueClassIDs = append(uniqueClassIDs, id)
	}
	matched, err := s.repo.CountClassesInYear(ctx, yearID, uniqueClassIDs)
	if err != nil {
		return 0, fmt.Errorf("failed to validate target classes: %w", err)
	}
	if int(matched) != len(uniqueClassIDs) {
		return 0, ErrCommitTargetClassMismatch
	}

	if err := s.repo.CommitAssignments(ctx, yearID, studentIDs, classIDs); err != nil {
		return 0, fmt.Errorf("failed to commit assignments: %w", err)
	}

	return len(req.Assignments), nil
}
