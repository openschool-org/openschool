package services

import (
	"bytes"
	"context"
	"fmt"
	"strconv"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jung-kurt/gofpdf"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/repositories"
)

// ReportExportService renders fixed report templates (attendance, marks) to
// PDF via gofpdf, with an optional column subset per request — the
// server-side approach chosen for Phase 7's report-export item (no
// client-side template builder / drag-and-drop layout engine).
type ReportExportService struct {
	attendance *repositories.AttendanceRepository
	termMark   *repositories.TermMarkRepository
	class      *repositories.ClassRepository
	term       *repositories.TermRepository
	subject    *repositories.SubjectRepository
}

func NewReportExportService(
	attendance *repositories.AttendanceRepository,
	termMark *repositories.TermMarkRepository,
	class *repositories.ClassRepository,
	term *repositories.TermRepository,
	subject *repositories.SubjectRepository,
) *ReportExportService {
	return &ReportExportService{attendance: attendance, termMark: termMark, class: class, term: term, subject: subject}
}

var attendanceReportColumns = []string{"date", "student", "index_number", "status", "note"}
var attendanceReportHeaders = map[string]string{
	"date": "Date", "student": "Student", "index_number": "Index No.", "status": "Status", "note": "Note",
}

var marksReportColumns = []string{"student", "index_number", "marks", "max_marks", "percentage"}
var marksReportHeaders = map[string]string{
	"student": "Student", "index_number": "Index No.", "marks": "Marks", "max_marks": "Max Marks", "percentage": "%",
}

func resolveColumns(requested []string, all []string) []string {
	if len(requested) == 0 {
		return all
	}
	valid := make(map[string]bool, len(all))
	for _, c := range all {
		valid[c] = true
	}
	out := make([]string, 0, len(requested))
	for _, c := range requested {
		if valid[c] {
			out = append(out, c)
		}
	}
	if len(out) == 0 {
		return all
	}
	return out
}

// ExportAttendance renders the attendance report PDF and returns the raw bytes.
func (s *ReportExportService) ExportAttendance(ctx context.Context, req models.AttendanceReportRequest) ([]byte, error) {
	classID, err := uuid.Parse(req.ClassID)
	if err != nil {
		return nil, fmt.Errorf("invalid class id")
	}
	class, err := s.class.GetByID(ctx, classID)
	if err != nil {
		return nil, fmt.Errorf("class not found")
	}
	records, err := s.attendance.ListForClassInRange(ctx, classID, req.From, req.To)
	if err != nil {
		return nil, err
	}

	columns := resolveColumns(req.Columns, attendanceReportColumns)
	rows := make([][]string, 0, len(records))
	for _, r := range records {
		values := map[string]string{
			"date":         r.SessionDate.Time.Format("2006-01-02"),
			"student":      r.StudentName,
			"index_number": r.StudentIndex,
			"status":       r.Status,
			"note":         r.Note.String,
		}
		row := make([]string, len(columns))
		for i, c := range columns {
			row[i] = values[c]
		}
		rows = append(rows, row)
	}

	headers := make([]string, len(columns))
	for i, c := range columns {
		headers[i] = attendanceReportHeaders[c]
	}

	title := fmt.Sprintf("Attendance Report — %s (%s to %s)", class.Name, req.From.Format("2006-01-02"), req.To.Format("2006-01-02"))
	return renderTablePDF(title, headers, rows)
}

// ExportMarks renders the marks report PDF and returns the raw bytes.
func (s *ReportExportService) ExportMarks(ctx context.Context, req models.MarksReportRequest) ([]byte, error) {
	classID, err := uuid.Parse(req.ClassID)
	if err != nil {
		return nil, fmt.Errorf("invalid class id")
	}
	termID, err := uuid.Parse(req.TermID)
	if err != nil {
		return nil, fmt.Errorf("invalid term id")
	}
	subjectID, err := uuid.Parse(req.SubjectID)
	if err != nil {
		return nil, fmt.Errorf("invalid subject id")
	}

	class, err := s.class.GetByID(ctx, classID)
	if err != nil {
		return nil, fmt.Errorf("class not found")
	}
	term, err := s.term.GetByID(ctx, termID)
	if err != nil {
		return nil, fmt.Errorf("term not found")
	}
	subject, err := s.subject.GetByID(ctx, subjectID)
	if err != nil {
		return nil, fmt.Errorf("subject not found")
	}

	marks, err := s.termMark.ListClassMarksForTermSubject(ctx, db.ListClassMarksForTermSubjectParams{
		ClassID:   classID,
		TermID:    termID,
		SubjectID: subjectID,
	})
	if err != nil {
		return nil, err
	}

	columns := resolveColumns(req.Columns, marksReportColumns)
	rows := make([][]string, 0, len(marks))
	for _, m := range marks {
		if !m.TermMarkID.Valid {
			continue // not yet marked — excluded from the export
		}
		pct := 0.0
		if m.MaxMarks.Valid && m.Marks.Valid {
			maxF := numericToFloat64(m.MaxMarks)
			marksF := numericToFloat64(m.Marks)
			if maxF > 0 {
				pct = marksF / maxF * 100
			}
		}
		values := map[string]string{
			"student":      m.StudentName,
			"index_number": m.IndexNumber,
			"marks":        formatNumeric(m.Marks),
			"max_marks":    formatNumeric(m.MaxMarks),
			"percentage":   fmt.Sprintf("%.1f", pct),
		}
		row := make([]string, len(columns))
		for i, c := range columns {
			row[i] = values[c]
		}
		rows = append(rows, row)
	}

	headers := make([]string, len(columns))
	for i, c := range columns {
		headers[i] = marksReportHeaders[c]
	}

	title := fmt.Sprintf("Marks Report — %s | %s | %s", class.Name, term.Name, subject.Name)
	return renderTablePDF(title, headers, rows)
}

// renderTablePDF builds a simple landscape A4 table PDF: a title line and a
// header row followed by data rows, columns evenly spaced.
func renderTablePDF(title string, headers []string, rows [][]string) ([]byte, error) {
	pdf := gofpdf.New("L", "mm", "A4", "")
	pdf.AddPage()
	pdf.SetFont("Helvetica", "B", 14)
	pdf.CellFormat(0, 10, title, "", 1, "L", false, 0, "")
	pdf.Ln(2)

	pageWidth, _ := pdf.GetPageSize()
	marginL, _, marginR, _ := pdf.GetMargins()
	usableWidth := pageWidth - marginL - marginR
	colWidth := usableWidth / float64(len(headers))

	pdf.SetFont("Helvetica", "B", 10)
	pdf.SetFillColor(230, 230, 230)
	for _, h := range headers {
		pdf.CellFormat(colWidth, 8, h, "1", 0, "L", true, 0, "")
	}
	pdf.Ln(-1)

	pdf.SetFont("Helvetica", "", 9)
	for _, row := range rows {
		for _, cell := range row {
			pdf.CellFormat(colWidth, 7, cell, "1", 0, "L", false, 0, "")
		}
		pdf.Ln(-1)
	}

	if len(rows) == 0 {
		pdf.SetFont("Helvetica", "I", 9)
		pdf.CellFormat(usableWidth, 8, "No data for the selected range.", "1", 1, "C", false, 0, "")
	}

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, fmt.Errorf("failed to render PDF: %w", err)
	}
	return buf.Bytes(), nil
}

// formatNumeric renders a pgtype.Numeric mark value trimmed of trailing
// zeros (e.g. "85" not "85.00"), or "-" if NULL.
func formatNumeric(n pgtype.Numeric) string {
	if !n.Valid {
		return "-"
	}
	return strconv.FormatFloat(numericToFloat64(n), 'f', -1, 64)
}
