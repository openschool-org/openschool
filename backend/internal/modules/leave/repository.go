package leave

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type Repository struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool, queries: db.New(pool)}
}

// create stores the application and its relief rows together.
func (r *Repository) create(ctx context.Context, app Application) (uuid.UUID, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return uuid.Nil, err
	}
	defer tx.Rollback(ctx)
	qtx := r.queries.WithTx(tx)
	id, err := qtx.CreateLeaveRequest(ctx, db.CreateLeaveRequestParams{
		TeacherID: app.TeacherID, LeaveType: app.LeaveType, StartDate: dateValue(app.Start), EndDate: dateValue(app.End),
		DayPart: app.DayPart, StartTime: clockValue(app.StartTime), EndTime: clockValue(app.EndTime), Days: app.Days,
		Reason: app.Reason, ActingTeacherID: uuidValue(app.ActingTeacherID),
	})
	if err != nil {
		return uuid.Nil, err
	}
	for _, relief := range app.Relief {
		if err := qtx.InsertLeaveRelief(ctx, db.InsertLeaveReliefParams{
			LeaveRequestID: id, Date: dateValue(relief.Date), PeriodNumber: relief.PeriodNumber, ClassID: relief.ClassID,
			SubjectID: uuidValue(relief.SubjectID), ReliefTeacherID: uuidValue(relief.ReliefTeacherID),
		}); err != nil {
			return uuid.Nil, err
		}
	}
	return id, tx.Commit(ctx)
}

func (r *Repository) get(ctx context.Context, id uuid.UUID) (Request, error) {
	row, err := r.queries.GetLeaveRequest(ctx, id)
	if err != nil {
		return Request{}, err
	}
	return mapRequest(db.ListLeaveRequestsPageRow{
		ID: row.ID, TeacherID: row.TeacherID, TeacherName: row.TeacherName, EmployeeNumber: row.EmployeeNumber,
		TeacherUserID: row.TeacherUserID, LeaveType: row.LeaveType, StartDate: row.StartDate, EndDate: row.EndDate,
		DayPart: row.DayPart, StartTime: row.StartTime, EndTime: row.EndTime, Days: row.Days, Reason: row.Reason,
		ActingTeacherID: row.ActingTeacherID, ActingTeacherName: row.ActingTeacherName, Status: row.Status,
		DecidedAt: row.DecidedAt, DecidedByName: row.DecidedByName, DecisionNote: row.DecisionNote, CreatedAt: row.CreatedAt,
	}), nil
}

func (r *Repository) relief(ctx context.Context, id uuid.UUID) ([]ReliefPeriod, error) {
	rows, err := r.queries.ListLeaveRelief(ctx, id)
	if err != nil {
		return nil, err
	}
	out := make([]ReliefPeriod, len(rows))
	for i, row := range rows {
		out[i] = ReliefPeriod{
			ID: row.ID, Date: dateString(row.Date), PeriodNumber: row.PeriodNumber, ClassID: row.ClassID, ClassName: row.ClassName,
			SubjectID: idPointer(row.SubjectID), SubjectName: row.SubjectName,
			ReliefTeacherID: idPointer(row.ReliefTeacherID), ReliefTeacherName: row.ReliefTeacherName,
		}
	}
	return out, nil
}

func (r *Repository) list(ctx context.Context, f RegisterFilter) (RequestPage, error) {
	rows, err := r.queries.ListLeaveRequestsPage(ctx, db.ListLeaveRequestsPageParams{
		Year: int32(f.Year), TeacherID: uuidValue(f.TeacherID), Status: textValue(f.Status), LeaveType: textValue(f.LeaveType),
		Search: textValue(f.Search), PageLimit: f.Limit, PageOffset: f.Offset,
	})
	if err != nil {
		return RequestPage{}, err
	}
	page := RequestPage{Items: make([]Request, len(rows)), Limit: f.Limit, Offset: f.Offset}
	for i, row := range rows {
		page.Items[i] = mapRequest(row)
		page.Total = row.Total
	}
	return page, nil
}

func (r *Repository) overlapping(ctx context.Context, teacherID uuid.UUID, start, end time.Time) (int64, error) {
	return r.queries.CountOverlappingLeave(ctx, db.CountOverlappingLeaveParams{TeacherID: teacherID, StartDate: dateValue(start), EndDate: dateValue(end)})
}

func (r *Repository) usage(ctx context.Context, teacherID uuid.UUID, year int) (map[string]Usage, error) {
	rows, err := r.queries.SumLeaveDaysByType(ctx, db.SumLeaveDaysByTypeParams{TeacherID: teacherID, Year: int32(year)})
	if err != nil {
		return nil, err
	}
	out := make(map[string]Usage, len(rows))
	for _, row := range rows {
		out[row.LeaveType] = Usage{Approved: row.ApprovedDays, Pending: row.PendingDays}
	}
	return out, nil
}

func (r *Repository) shortLeaveInMonth(ctx context.Context, teacherID uuid.UUID, month time.Time) (int64, error) {
	first := time.Date(month.Year(), month.Month(), 1, 0, 0, 0, 0, time.UTC)
	return r.queries.CountShortLeaveInMonth(ctx, db.CountShortLeaveInMonthParams{
		TeacherID: teacherID, MonthStart: dateValue(first), MonthEnd: dateValue(first.AddDate(0, 1, -1)),
	})
}

func (r *Repository) decide(ctx context.Context, id uuid.UUID, status string, decidedBy uuid.UUID, note string) (int64, error) {
	return r.queries.DecideLeaveRequest(ctx, db.DecideLeaveRequestParams{ID: id, Status: status, DecidedBy: uuidValue(decidedBy), DecisionNote: textValue(note)})
}

func (r *Repository) cancel(ctx context.Context, id, teacherID uuid.UUID) (int64, error) {
	return r.queries.CancelLeaveRequest(ctx, db.CancelLeaveRequestParams{ID: id, TeacherID: teacherID})
}

func (r *Repository) teacherPeriods(ctx context.Context, teacherID, academicYearID uuid.UUID) ([]periodSlot, error) {
	rows, err := r.queries.ListTeacherPeriodsForLeave(ctx, db.ListTeacherPeriodsForLeaveParams{TeacherID: uuidValue(teacherID), AcademicYearID: academicYearID})
	if err != nil {
		return nil, err
	}
	out := make([]periodSlot, len(rows))
	for i, row := range rows {
		out[i] = periodSlot{
			DayOfWeek: row.DayOfWeek, PeriodNumber: row.PeriodNumber, ClassID: row.ClassID, ClassName: row.ClassName,
			SubjectID: uuid.UUID(row.SubjectID.Bytes), SubjectName: row.SubjectName,
			StartTime: row.StartTime, EndTime: row.EndTime, AfterInterval: row.AfterInterval,
		}
	}
	return out, nil
}

func (r *Repository) reliefCandidates(ctx context.Context, date time.Time, dayOfWeek, period int16, academicYearID, exclude uuid.UUID) ([]ReliefCandidate, error) {
	rows, err := r.queries.ListReliefCandidates(ctx, db.ListReliefCandidatesParams{
		Date: dateValue(date), DayOfWeek: dayOfWeek, PeriodNumber: period, AcademicYearID: academicYearID, ExcludeTeacherID: exclude,
	})
	if err != nil {
		return nil, err
	}
	out := make([]ReliefCandidate, len(rows))
	for i, row := range rows {
		out[i] = ReliefCandidate{ID: row.ID, FullName: row.FullName, EmployeeNumber: row.EmployeeNumber, ReliefPeriods: row.ReliefPeriods}
	}
	return out, nil
}

func (r *Repository) balances(ctx context.Context, year int, search string, limit, offset int32) (BalancePage, error) {
	rows, err := r.queries.ListLeaveBalances(ctx, db.ListLeaveBalancesParams{Year: int32(year), Search: textValue(search), PageLimit: limit, PageOffset: offset})
	if err != nil {
		return BalancePage{}, err
	}
	page := BalancePage{Items: make([]TeacherBalance, len(rows)), Limit: limit, Offset: offset}
	for i, row := range rows {
		page.Items[i] = TeacherBalance{
			TeacherID: row.TeacherID, TeacherName: row.TeacherName, EmployeeNumber: row.EmployeeNumber,
			CasualDays: row.CasualDays, SickDays: row.SickDays, DutyDays: row.DutyDays, MaternityDays: row.MaternityDays,
			NoPayDays: row.NoPayDays, ShortCount: row.ShortCount,
		}
		page.Total = row.Total
	}
	return page, nil
}

func (r *Repository) reliefForDate(ctx context.Context, date time.Time) ([]DailyRelief, error) {
	rows, err := r.queries.ListReliefForDate(ctx, dateValue(date))
	if err != nil {
		return nil, err
	}
	out := make([]DailyRelief, len(rows))
	for i, row := range rows {
		out[i] = DailyRelief{
			ID: row.ID, PeriodNumber: row.PeriodNumber, LeaveRequestID: row.LeaveRequestID, LeaveStatus: row.LeaveStatus,
			LeaveType: row.LeaveType, AbsentTeacherName: row.AbsentTeacherName, ClassID: row.ClassID, ClassName: row.ClassName,
			SubjectName: row.SubjectName, ReliefTeacherID: idPointer(row.ReliefTeacherID), ReliefTeacherName: row.ReliefTeacherName,
		}
	}
	return out, nil
}

func (r *Repository) reliefDuties(ctx context.Context, teacherID uuid.UUID, from time.Time) ([]ReliefDuty, error) {
	rows, err := r.queries.ListMyReliefDuties(ctx, db.ListMyReliefDutiesParams{TeacherID: uuidValue(teacherID), FromDate: dateValue(from)})
	if err != nil {
		return nil, err
	}
	out := make([]ReliefDuty, len(rows))
	for i, row := range rows {
		out[i] = ReliefDuty{
			ID: row.ID, Date: dateString(row.Date), PeriodNumber: row.PeriodNumber,
			AbsentTeacherName: row.AbsentTeacherName, ClassName: row.ClassName, SubjectName: row.SubjectName,
		}
	}
	return out, nil
}

func (r *Repository) approverUserIDs(ctx context.Context, exclude uuid.UUID) ([]uuid.UUID, error) {
	return r.queries.ListLeaveApproverUserIDs(ctx, exclude)
}

func (r *Repository) userIDsForTeachers(ctx context.Context, ids []uuid.UUID) ([]uuid.UUID, error) {
	return r.queries.ListUserIDsForTeachers(ctx, ids)
}

func mapRequest(row db.ListLeaveRequestsPageRow) Request {
	request := Request{
		ID: row.ID, TeacherID: row.TeacherID, TeacherName: row.TeacherName, EmployeeNumber: row.EmployeeNumber,
		LeaveType: row.LeaveType, StartDate: dateString(row.StartDate), EndDate: dateString(row.EndDate), DayPart: row.DayPart,
		StartTime: row.StartTime, EndTime: row.EndTime, Days: row.Days, Reason: row.Reason,
		ActingTeacherID: idPointer(row.ActingTeacherID), ActingTeacherName: row.ActingTeacherName, Status: row.Status,
		DecidedByName: row.DecidedByName, DecisionNote: row.DecisionNote, CreatedAt: row.CreatedAt.Time, teacherUserID: row.TeacherUserID,
	}
	if row.DecidedAt.Valid {
		request.DecidedAt = &row.DecidedAt.Time
	}
	return request
}

func dateValue(value time.Time) pgtype.Date { return pgtype.Date{Time: value, Valid: true} }

func dateString(value pgtype.Date) string {
	if !value.Valid {
		return ""
	}
	return value.Time.Format(time.DateOnly)
}

func clockValue(value string) pgtype.Time {
	minutes, err := clockMinutes(value)
	if err != nil {
		return pgtype.Time{}
	}
	return pgtype.Time{Microseconds: int64(minutes) * int64(time.Minute/time.Microsecond), Valid: true}
}

func uuidValue(id uuid.UUID) pgtype.UUID {
	return pgtype.UUID{Bytes: id, Valid: id != uuid.Nil}
}

func idPointer(id pgtype.UUID) *uuid.UUID {
	if !id.Valid {
		return nil
	}
	value := uuid.UUID(id.Bytes)
	return &value
}

func textValue(value string) pgtype.Text {
	return pgtype.Text{String: value, Valid: value != ""}
}
