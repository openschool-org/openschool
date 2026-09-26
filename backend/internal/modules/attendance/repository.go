package attendance

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type MarkInput struct {
	StudentID uuid.UUID
	Status    string
	Note      string
}

type Repository struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool, queries: db.New(pool)}
}

func (r *Repository) createSession(ctx context.Context, classID, takenBy uuid.UUID, date time.Time) (Session, error) {
	row, err := r.queries.CreateAttendanceSession(ctx, db.CreateAttendanceSessionParams{ClassID: classID, TakenBy: takenBy, Date: dateValue(date)})
	return mapSession(row), err
}
func (r *Repository) getSession(ctx context.Context, id uuid.UUID) (Session, error) {
	row, err := r.queries.GetAttendanceSessionByID(ctx, id)
	return mapSession(row), err
}
func (r *Repository) findSession(ctx context.Context, classID uuid.UUID, date time.Time) (Session, error) {
	row, err := r.queries.GetAttendanceSessionByClassAndDate(ctx, db.GetAttendanceSessionByClassAndDateParams{ClassID: classID, Date: dateValue(date)})
	return mapSession(row), err
}
func (r *Repository) listSessionsByClass(ctx context.Context, classID uuid.UUID) ([]Session, error) {
	rows, err := r.queries.ListAttendanceSessionsByClass(ctx, classID)
	if err != nil {
		return nil, err
	}
	out := make([]Session, len(rows))
	for i, row := range rows {
		out[i] = mapSession(row)
	}
	return out, nil
}
func (r *Repository) listSessionsByDate(ctx context.Context, date time.Time, gradeIDs []uuid.UUID) ([]DailySession, error) {
	rows, err := r.queries.ListAttendanceSessionsByDate(ctx, db.ListAttendanceSessionsByDateParams{Date: dateValue(date), GradeIds: gradeIDs})
	if err != nil {
		return nil, err
	}
	out := make([]DailySession, len(rows))
	for i, row := range rows {
		out[i] = DailySession{
			Session:       Session{ID: row.ID, ClassID: row.ClassID, TakenBy: row.TakenBy, Date: row.Date, CreatedAt: row.CreatedAt},
			ClassName:     row.ClassName,
			GradeName:     row.GradeName,
			TeacherName:   row.TeacherName,
			EnrolledCount: row.EnrolledCount,
			MarkedCount:   row.MarkedCount,
		}
	}
	return out, nil
}
func (r *Repository) deleteSession(ctx context.Context, id uuid.UUID) error {
	return r.queries.DeleteAttendanceSession(ctx, id)
}
func (r *Repository) listRecords(ctx context.Context, sessionID uuid.UUID) ([]Record, error) {
	rows, err := r.queries.ListAttendanceRecordsBySession(ctx, sessionID)
	if err != nil {
		return nil, err
	}
	out := make([]Record, len(rows))
	for i, row := range rows {
		out[i] = mapRecord(row)
	}
	return out, nil
}
func (r *Repository) markBatch(ctx context.Context, sessionID uuid.UUID, records []MarkInput) ([]Record, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	qtx := r.queries.WithTx(tx)
	out := make([]Record, len(records))
	for i, record := range records {
		row, writeErr := qtx.MarkAttendance(ctx, db.MarkAttendanceParams{SessionID: sessionID, StudentID: record.StudentID, Status: record.Status, Note: textValue(record.Note)})
		err = writeErr
		if err != nil {
			return nil, err
		}
		out[i] = mapRecord(row)
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return out, nil
}
func (r *Repository) listBySession(ctx context.Context, id uuid.UUID) ([]SessionRecord, error) {
	rows, err := r.queries.ListAttendanceBySession(ctx, id)
	if err != nil {
		return nil, err
	}
	out := make([]SessionRecord, len(rows))
	for i, row := range rows {
		out[i] = SessionRecord{Record: Record{ID: row.ID, SessionID: row.SessionID, StudentID: row.StudentID, Status: row.Status, Note: row.Note}, StudentName: row.StudentName, StudentIndex: row.StudentIndex}
	}
	return out, nil
}
func (r *Repository) listByStudent(ctx context.Context, id uuid.UUID) ([]StudentRecord, error) {
	rows, err := r.queries.ListAttendanceByStudent(ctx, id)
	if err != nil {
		return nil, err
	}
	out := make([]StudentRecord, len(rows))
	for i, row := range rows {
		out[i] = StudentRecord{Record: Record{ID: row.ID, SessionID: row.SessionID, StudentID: row.StudentID, Status: row.Status, Note: row.Note}, SessionDate: row.SessionDate, ClassName: row.ClassName}
	}
	return out, nil
}
func (r *Repository) summary(ctx context.Context, studentID, classID uuid.UUID) (Summary, error) {
	row, err := r.queries.GetAttendanceSummaryByStudent(ctx, db.GetAttendanceSummaryByStudentParams{StudentID: studentID, ClassID: classID})
	return Summary{TotalDays: row.TotalDays, Present: row.Present, Absent: row.Absent, Late: row.Late, Excused: row.Excused}, err
}
func (r *Repository) userExists(ctx context.Context, id uuid.UUID) bool {
	_, err := r.queries.GetUserByID(ctx, id)
	return err == nil
}
func (r *Repository) userByEmail(ctx context.Context, email string) (uuid.UUID, error) {
	user, err := r.queries.GetUserByEmail(ctx, email)
	return user.ID, err
}
func (r *Repository) createUser(ctx context.Context, actor Actor) (uuid.UUID, error) {
	user, err := r.queries.CreateUser(ctx, db.CreateUserParams{ID: actor.ID, Email: actor.Email, FullName: actor.FullName, Role: actor.Role})
	return user.ID, err
}
func (r *Repository) teacherByUser(ctx context.Context, userID uuid.UUID) (uuid.UUID, error) {
	teacher, err := r.queries.GetTeacherByUserID(ctx, userID)
	return teacher.ID, err
}
func (r *Repository) teacherAssigned(ctx context.Context, classID, teacherID uuid.UUID) (bool, error) {
	return r.queries.IsTeacherAssignedToClass(ctx, db.IsTeacherAssignedToClassParams{ID: classID, FormTeacherID: pgtype.UUID{Bytes: teacherID, Valid: true}, TeacherID: teacherID})
}
func (r *Repository) studentClass(ctx context.Context, studentID uuid.UUID) (uuid.UUID, error) {
	class, err := r.queries.GetStudentCurrentClass(ctx, studentID)
	return class.ID, err
}
func (r *Repository) guardianUsers(ctx context.Context, studentID uuid.UUID) ([]uuid.UUID, error) {
	rows, err := r.queries.ListGuardianUserIDsByStudentIDs(ctx, []uuid.UUID{studentID})
	if err != nil {
		return nil, err
	}
	ids := make([]uuid.UUID, 0, len(rows))
	for _, row := range rows {
		if row.Valid {
			ids = append(ids, uuid.UUID(row.Bytes))
		}
	}
	return ids, nil
}
func (r *Repository) studentName(ctx context.Context, studentID uuid.UUID) (string, error) {
	student, err := r.queries.GetStudentByID(ctx, studentID)
	return student.FullName, err
}
func (r *Repository) className(ctx context.Context, classID uuid.UUID) (string, error) {
	class, err := r.queries.GetClassByID(ctx, classID)
	return class.Name, err
}
func (r *Repository) currentAcademicYear(ctx context.Context) (uuid.UUID, error) {
	year, err := r.queries.GetCurrentAcademicYear(ctx)
	return year.ID, err
}
func (r *Repository) listReportRows(ctx context.Context, classID uuid.UUID, from, to time.Time) ([]ReportRow, error) {
	rows, err := r.queries.ListAttendanceRecordsForClassInRange(ctx, db.ListAttendanceRecordsForClassInRangeParams{ClassID: classID, Date: dateValue(from), Date_2: dateValue(to)})
	if err != nil {
		return nil, err
	}
	out := make([]ReportRow, len(rows))
	for i, row := range rows {
		out[i] = ReportRow{ID: row.ID, StudentName: row.StudentName, StudentIndex: row.StudentIndex, SessionDate: row.SessionDate, Status: row.Status, Note: row.Note}
	}
	return out, nil
}

func dateValue(value time.Time) pgtype.Date { return pgtype.Date{Time: value, Valid: true} }
func textValue(value string) pgtype.Text    { return pgtype.Text{String: value, Valid: value != ""} }
func mapSession(row db.AttendanceSession) Session {
	return Session{ID: row.ID, ClassID: row.ClassID, TakenBy: row.TakenBy, Date: row.Date, CreatedAt: row.CreatedAt}
}
func mapRecord(row db.AttendanceRecord) Record {
	return Record{ID: row.ID, SessionID: row.SessionID, StudentID: row.StudentID, Status: row.Status, Note: row.Note}
}

func (r *Repository) upsertTeacher(ctx context.Context, id uuid.UUID, date time.Time, status string, markedBy uuid.UUID, note string) (StaffRecord, error) {
	row, err := r.queries.UpsertTeacherAttendance(ctx, db.UpsertTeacherAttendanceParams{TeacherID: uuidValue(id), Date: dateValue(date), Status: status, MarkedBy: uuidValue(markedBy), Note: textValue(note)})
	return mapStaffRecord(row), err
}
func (r *Repository) upsertNonAcademic(ctx context.Context, id uuid.UUID, date time.Time, status string, markedBy uuid.UUID, note string) (StaffRecord, error) {
	row, err := r.queries.UpsertNonAcademicStaffAttendance(ctx, db.UpsertNonAcademicStaffAttendanceParams{NonAcademicStaffID: uuidValue(id), Date: dateValue(date), Status: status, MarkedBy: uuidValue(markedBy), Note: textValue(note)})
	return mapStaffRecord(row), err
}
func (r *Repository) teachersByDate(ctx context.Context, date time.Time) ([]staffDirectoryRow, error) {
	rows, err := r.queries.ListTeacherAttendanceByDate(ctx, dateValue(date))
	if err != nil {
		return nil, err
	}
	out := make([]staffDirectoryRow, len(rows))
	for i, row := range rows {
		out[i] = mapStaffDirectory(row.TeacherID, row.FullName, row.EmployeeNumber, row.RecordID, row.Status, row.Note)
	}
	return out, nil
}
func (r *Repository) nonAcademicByDate(ctx context.Context, date time.Time) ([]staffDirectoryRow, error) {
	rows, err := r.queries.ListNonAcademicStaffAttendanceByDate(ctx, dateValue(date))
	if err != nil {
		return nil, err
	}
	out := make([]staffDirectoryRow, len(rows))
	for i, row := range rows {
		out[i] = mapStaffDirectory(row.StaffID, row.FullName, row.EmployeeNumber, row.RecordID, row.Status, row.Note)
	}
	return out, nil
}
func (r *Repository) teacherSummary(ctx context.Context, from, to time.Time) ([]staffSummaryRow, error) {
	rows, err := r.queries.MonthlyTeacherAttendanceSummary(ctx, db.MonthlyTeacherAttendanceSummaryParams{Date: dateValue(from), Date_2: dateValue(to)})
	if err != nil {
		return nil, err
	}
	out := make([]staffSummaryRow, len(rows))
	for i, row := range rows {
		out[i] = staffSummaryRow{ID: row.TeacherID, FullName: row.FullName, PresentCount: row.PresentCount, LateCount: row.LateCount, AbsentCount: row.AbsentCount, LeaveCount: row.LeaveCount}
	}
	return out, nil
}
func (r *Repository) nonAcademicSummary(ctx context.Context, from, to time.Time) ([]staffSummaryRow, error) {
	rows, err := r.queries.MonthlyNonAcademicStaffAttendanceSummary(ctx, db.MonthlyNonAcademicStaffAttendanceSummaryParams{Date: dateValue(from), Date_2: dateValue(to)})
	if err != nil {
		return nil, err
	}
	out := make([]staffSummaryRow, len(rows))
	for i, row := range rows {
		out[i] = staffSummaryRow{ID: row.StaffID, FullName: row.FullName, PresentCount: row.PresentCount, LateCount: row.LateCount, AbsentCount: row.AbsentCount, LeaveCount: row.LeaveCount}
	}
	return out, nil
}
func (r *Repository) teacherHistory(ctx context.Context, id uuid.UUID, from, to time.Time) ([]StaffRecord, error) {
	rows, err := r.queries.ListTeacherAttendanceHistory(ctx, db.ListTeacherAttendanceHistoryParams{TeacherID: uuidValue(id), Date: dateValue(from), Date_2: dateValue(to)})
	return mapStaffRecords(rows, err)
}
func (r *Repository) nonAcademicHistory(ctx context.Context, id uuid.UUID, from, to time.Time) ([]StaffRecord, error) {
	rows, err := r.queries.ListNonAcademicStaffAttendanceHistory(ctx, db.ListNonAcademicStaffAttendanceHistoryParams{NonAcademicStaffID: uuidValue(id), Date: dateValue(from), Date_2: dateValue(to)})
	return mapStaffRecords(rows, err)
}
func uuidValue(id uuid.UUID) pgtype.UUID { return pgtype.UUID{Bytes: id, Valid: true} }
func mapStaffRecord(row db.StaffAttendanceRecord) StaffRecord {
	return StaffRecord{ID: row.ID, TeacherID: row.TeacherID, NonAcademicStaffID: row.NonAcademicStaffID, Date: row.Date, Status: row.Status, MarkedBy: row.MarkedBy, Note: row.Note, CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt}
}
func mapStaffRecords(rows []db.StaffAttendanceRecord, err error) ([]StaffRecord, error) {
	if err != nil {
		return nil, err
	}
	out := make([]StaffRecord, len(rows))
	for i, row := range rows {
		out[i] = mapStaffRecord(row)
	}
	return out, nil
}
func mapStaffDirectory(id uuid.UUID, name, employee string, recordID pgtype.UUID, status, note pgtype.Text) staffDirectoryRow {
	row := staffDirectoryRow{ID: id, FullName: name, EmployeeNumber: employee}
	if recordID.Valid {
		row.RecordID = uuid.UUID(recordID.Bytes)
	}
	if status.Valid {
		row.Status = status.String
	}
	if note.Valid {
		row.Note = note.String
	}
	return row
}

func (r *Repository) roster(ctx context.Context, date time.Time, q StaffRosterQuery) (StaffRosterPage, error) {
	params := db.ListStaffAttendanceRosterParams{Date: dateValue(date), Kind: string(q.Kind), Search: textValue(q.Search), PageLimit: q.Limit, PageOffset: q.Offset}
	rows, err := r.queries.ListStaffAttendanceRoster(ctx, params)
	if err != nil {
		return StaffRosterPage{}, err
	}
	// Window totals only ride on returned rows; past the last page, re-read them from the first row.
	head := rows
	if len(rows) == 0 && q.Offset > 0 {
		params.PageLimit, params.PageOffset = 1, 0
		if head, err = r.queries.ListStaffAttendanceRoster(ctx, params); err != nil {
			return StaffRosterPage{}, err
		}
	}
	page := StaffRosterPage{Items: make([]StaffAttendanceRow, len(rows)), Limit: q.Limit, Offset: q.Offset}
	for i, row := range rows {
		page.Items[i] = mapStaffDirectory(row.StaffID, row.FullName, row.EmployeeNumber, row.RecordID, row.Status, row.Note).toRow()
	}
	if len(head) > 0 {
		h := head[0]
		marked := h.PresentTotal + h.LateTotal + h.AbsentTotal + h.LeaveTotal
		page.Total = h.Total
		page.Totals = StaffStatusTotals{Present: h.PresentTotal, Late: h.LateTotal, Absent: h.AbsentTotal, Leave: h.LeaveTotal, Unmarked: h.Total - marked}
	}
	return page, nil
}

func (r *Repository) monthly(ctx context.Context, from, to time.Time, q StaffRosterQuery) (StaffMonthlyPage, error) {
	params := db.ListStaffAttendanceMonthlyParams{FromDate: dateValue(from), ToDate: dateValue(to), Kind: string(q.Kind), Search: textValue(q.Search), PageLimit: q.Limit, PageOffset: q.Offset}
	rows, err := r.queries.ListStaffAttendanceMonthly(ctx, params)
	if err != nil {
		return StaffMonthlyPage{}, err
	}
	page := StaffMonthlyPage{Items: make([]StaffAttendanceSummaryRow, len(rows)), Limit: q.Limit, Offset: q.Offset}
	for i, row := range rows {
		page.Items[i] = StaffAttendanceSummaryRow{StaffID: row.StaffID.String(), FullName: row.FullName, PresentCount: row.PresentCount, LateCount: row.LateCount, AbsentCount: row.AbsentCount, LeaveCount: row.LeaveCount}
		page.Total = row.Total
	}
	if len(rows) == 0 && q.Offset > 0 {
		params.PageLimit, params.PageOffset = 1, 0
		probe, err := r.queries.ListStaffAttendanceMonthly(ctx, params)
		if err != nil {
			return StaffMonthlyPage{}, err
		}
		if len(probe) > 0 {
			page.Total = probe[0].Total
		}
	}
	return page, nil
}

func (r *Repository) markUnmarkedPresent(ctx context.Context, date time.Time, kind StaffKind, markedBy uuid.UUID) (int64, error) {
	if kind == StaffKindTeacher {
		return r.queries.MarkUnmarkedTeachersPresent(ctx, db.MarkUnmarkedTeachersPresentParams{Date: dateValue(date), MarkedBy: markedBy})
	}
	return r.queries.MarkUnmarkedNonAcademicStaffPresent(ctx, db.MarkUnmarkedNonAcademicStaffPresentParams{Date: dateValue(date), MarkedBy: markedBy})
}
