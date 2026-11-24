package academics

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

// MarkHistoryYear is one academic year of a student's marks, newest year first.
type MarkHistoryYear struct {
	AcademicYearID uuid.UUID         `json:"academic_year_id"`
	AcademicYear   string            `json:"academic_year"`
	IsCurrent      bool              `json:"is_current"`
	ClassName      string            `json:"class_name"`
	GradeName      string            `json:"grade_name"`
	Terms          []MarkHistoryTerm `json:"terms"`
}

// MarkHistoryTerm is one term of a year; Marks is empty when nothing is recorded yet.
type MarkHistoryTerm struct {
	ID        uuid.UUID         `json:"id"`
	Name      string            `json:"name"`
	StartDate string            `json:"start_date"`
	EndDate   string            `json:"end_date"`
	IsCurrent bool              `json:"is_current"`
	Marks     []MarkHistoryMark `json:"marks"`
}

// MarkHistoryMark is one subject's mark within a term.
type MarkHistoryMark struct {
	ID          uuid.UUID      `json:"id"`
	SubjectID   uuid.UUID      `json:"subject_id"`
	SubjectName string         `json:"subject_name"`
	SubjectCode string         `json:"subject_code"`
	TeacherName string         `json:"teacher_name"`
	Marks       pgtype.Numeric `json:"marks"`
	MaxMarks    pgtype.Numeric `json:"max_marks"`
	IsAbsent    bool           `json:"is_absent"`
}

// markHistoryRow is one flat row of a student's history, ordered newest year first.
type markHistoryRow struct {
	AcademicYearID           uuid.UUID
	AcademicYear             string
	YearIsCurrent            bool
	ClassName, GradeName     string
	TermID                   uuid.UUID
	TermName                 string
	TermStart, TermEnd       pgtype.Date
	TermIsCurrent            bool
	MarkID, SubjectID        pgtype.UUID
	Marks, MaxMarks          pgtype.Numeric
	IsAbsent                 pgtype.Bool
	SubjectName, SubjectCode pgtype.Text
	TeacherName              string
}

// StudentMarkHistory returns every term of every year the student had a class, with its marks.
func (s *termMarkService) StudentMarkHistory(ctx context.Context, student uuid.UUID) ([]MarkHistoryYear, error) {
	rows, err := s.store.history(ctx, student)
	if err != nil {
		return nil, err
	}
	return groupMarkHistory(rows), nil
}

// groupMarkHistory nests the flat, already ordered rows into years and terms.
func groupMarkHistory(rows []markHistoryRow) []MarkHistoryYear {
	years := []MarkHistoryYear{}
	for _, row := range rows {
		if len(years) == 0 || years[len(years)-1].AcademicYearID != row.AcademicYearID {
			years = append(years, MarkHistoryYear{
				AcademicYearID: row.AcademicYearID, AcademicYear: row.AcademicYear, IsCurrent: row.YearIsCurrent,
				ClassName: row.ClassName, GradeName: row.GradeName, Terms: []MarkHistoryTerm{},
			})
		}
		year := &years[len(years)-1]
		if len(year.Terms) == 0 || year.Terms[len(year.Terms)-1].ID != row.TermID {
			year.Terms = append(year.Terms, MarkHistoryTerm{
				ID: row.TermID, Name: row.TermName, IsCurrent: row.TermIsCurrent,
				StartDate: row.TermStart.Time.Format("2006-01-02"), EndDate: row.TermEnd.Time.Format("2006-01-02"),
				Marks: []MarkHistoryMark{},
			})
		}
		if !row.MarkID.Valid {
			continue
		}
		term := &year.Terms[len(year.Terms)-1]
		term.Marks = append(term.Marks, MarkHistoryMark{
			ID: row.MarkID.Bytes, SubjectID: row.SubjectID.Bytes, SubjectName: row.SubjectName.String,
			SubjectCode: row.SubjectCode.String, TeacherName: row.TeacherName,
			Marks: row.Marks, MaxMarks: row.MaxMarks, IsAbsent: row.IsAbsent.Bool,
		})
	}
	return years
}
