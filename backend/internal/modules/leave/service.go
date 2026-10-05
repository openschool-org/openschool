package leave

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/openschool-org/openschool/internal/ports"
)

var (
	ErrNotFound       = errors.New("leave application not found")
	ErrForbidden      = errors.New("only the Principal, a Vice Principal or an administrator can do this")
	ErrNotPending     = errors.New("this application has already been decided or cancelled")
	ErrOwnLeave       = errors.New("you cannot decide your own leave application")
	ErrPrincipalLeave = errors.New("the Principal's leave is approved outside the school; an administrator records the decision")
	ErrNoteRequired   = errors.New("give a reason when rejecting an application")
)

// InvalidError marks a rejected application, as opposed to a failure.
type InvalidError struct{ err error }

func (e InvalidError) Error() string { return e.err.Error() }
func (e InvalidError) Unwrap() error { return e.err }

func invalid(err error) error { return InvalidError{err: err} }

// ApproverRank is how far a teacher may decide leave.
type ApproverRank int

const (
	NotApprover ApproverRank = iota
	VicePrincipal
	Principal
)

// Approvers resolves a teacher's leadership position.
type Approvers interface {
	LeaveRank(ctx context.Context, teacherID uuid.UUID) (ApproverRank, error)
}

// AttendanceMarker records an approved leave day on the staff attendance register.
type AttendanceMarker interface {
	MarkTeacherOnLeave(ctx context.Context, teacherID uuid.UUID, date time.Time, note string, markedBy uuid.UUID) error
}

// Notifier delivers in-app notifications to known users.
type Notifier interface {
	SendDirect(ctx context.Context, title, message, category, priority string, createdBy uuid.UUID, userIDs []uuid.UUID) error
}

// Actor is the caller of an approver endpoint. TeacherID is uuid.Nil for an administrator.
type Actor struct {
	UserID, TeacherID uuid.UUID
	Admin             bool
}

type store interface {
	create(context.Context, Application) (uuid.UUID, error)
	get(context.Context, uuid.UUID) (Request, error)
	relief(context.Context, uuid.UUID) ([]ReliefPeriod, error)
	list(context.Context, RegisterFilter) (RequestPage, error)
	overlapping(ctx context.Context, teacherID uuid.UUID, start, end time.Time) (int64, error)
	usage(ctx context.Context, teacherID uuid.UUID, year int) (map[string]Usage, error)
	shortLeaveInMonth(ctx context.Context, teacherID uuid.UUID, month time.Time) (int64, error)
	decide(ctx context.Context, id uuid.UUID, status string, decidedBy uuid.UUID, note string) (int64, error)
	cancel(ctx context.Context, id, teacherID uuid.UUID) (int64, error)
	teacherPeriods(ctx context.Context, teacherID, academicYearID uuid.UUID) ([]periodSlot, error)
	reliefCandidates(ctx context.Context, date time.Time, dayOfWeek, period int16, academicYearID, exclude uuid.UUID) ([]ReliefCandidate, error)
	balances(ctx context.Context, year int, search string, limit, offset int32) (BalancePage, error)
	reliefForDate(context.Context, time.Time) ([]DailyRelief, error)
	reliefDuties(ctx context.Context, teacherID uuid.UUID, from time.Time) ([]ReliefDuty, error)
	approverUserIDs(ctx context.Context, exclude uuid.UUID) ([]uuid.UUID, error)
	userIDsForTeachers(context.Context, []uuid.UUID) ([]uuid.UUID, error)
}

type Service struct {
	store      store
	approvers  Approvers
	attendance AttendanceMarker
	notify     Notifier
	years      ports.CurrentAcademicYearReader
	audit      ports.AuditRecorder
	now        func() time.Time
}

func NewService(store store, approvers Approvers, attendance AttendanceMarker, notify Notifier, years ports.CurrentAcademicYearReader, audit ports.AuditRecorder) *Service {
	return &Service{store: store, approvers: approvers, attendance: attendance, notify: notify, years: years, audit: audit, now: time.Now}
}

// Apply validates and stores a teacher's application, then tells the approvers.
func (s *Service) Apply(ctx context.Context, teacherID, userID uuid.UUID, req ApplyRequest) (RequestDetail, error) {
	app, err := parseApplication(teacherID, req)
	if err != nil {
		return RequestDetail{}, invalid(err)
	}
	if app.Days, err = chargedDays(app); err != nil {
		return RequestDetail{}, invalid(err)
	}
	if err := s.checkLimits(ctx, app); err != nil {
		return RequestDetail{}, err
	}
	id, err := s.store.create(ctx, app)
	if err != nil {
		return RequestDetail{}, err
	}
	detail, err := s.detail(ctx, id)
	if err != nil {
		return RequestDetail{}, err
	}
	if s.audit != nil {
		_ = s.audit.Record(ctx, "teacher_leave", id, "applied", userID, nil, detail.Request, "")
	}
	if approvers, err := s.store.approverUserIDs(ctx, teacherID); err == nil {
		s.send(ctx, "Leave application", fmt.Sprintf("%s applied for %s leave (%s). It is waiting for your approval.", detail.TeacherName, typeLabel(app.LeaveType), dateSpan(detail.Request)), userID, approvers)
	}
	return detail, nil
}

func (s *Service) checkLimits(ctx context.Context, app Application) error {
	overlaps, err := s.store.overlapping(ctx, app.TeacherID, app.Start, app.End)
	if err != nil {
		return err
	}
	if overlaps > 0 {
		return invalid(ErrOverlap)
	}
	if app.LeaveType == TypeShort {
		count, err := s.store.shortLeaveInMonth(ctx, app.TeacherID, app.Start)
		if err != nil {
			return err
		}
		if count >= ShortLeavePerMonth {
			return invalid(ErrShortLeaveUsedUp)
		}
		return nil
	}
	usage, err := s.store.usage(ctx, app.TeacherID, app.Start.Year())
	if err != nil {
		return err
	}
	if err := checkEntitlement(app.LeaveType, app.Days, usage); err != nil {
		return invalid(err)
	}
	return nil
}

// Cancel withdraws the teacher's own application while it is still pending.
func (s *Service) Cancel(ctx context.Context, teacherID, id, userID uuid.UUID) error {
	count, err := s.store.cancel(ctx, id, teacherID)
	if err != nil {
		return err
	}
	if count == 0 {
		if _, err := s.store.get(ctx, id); errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return ErrNotPending
	}
	if s.audit != nil {
		_ = s.audit.Record(ctx, "teacher_leave", id, "cancelled", userID, nil, nil, "")
	}
	return nil
}

// MyRequests lists the teacher's own applications for a year, newest first.
func (s *Service) MyRequests(ctx context.Context, teacherID uuid.UUID, year int) ([]Request, error) {
	page, err := s.store.list(ctx, RegisterFilter{Year: year, TeacherID: teacherID, Limit: 200})
	return page.Items, err
}

// MyBalance is the teacher's allowance, use and remaining leave for a year.
func (s *Service) MyBalance(ctx context.Context, teacherID uuid.UUID, year int) (Balance, error) {
	usage, err := s.store.usage(ctx, teacherID, year)
	if err != nil {
		return Balance{}, err
	}
	items := make([]BalanceItem, 0, 5)
	for _, leaveType := range []string{TypeCasual, TypeSick, TypeDuty, TypeMaternity, TypeNoPay} {
		used := usage[leaveType]
		item := BalanceItem{LeaveType: leaveType, Entitlement: annualEntitlement[leaveType], Used: used.Approved, Pending: used.Pending}
		if item.Entitlement > 0 {
			remaining := item.Entitlement - used.Approved - used.Pending
			item.Remaining = &remaining
		}
		items = append(items, item)
	}
	now := s.now()
	shortUsed, err := s.store.shortLeaveInMonth(ctx, teacherID, now)
	if err != nil {
		return Balance{}, err
	}
	remaining := float64(ShortLeavePerMonth - shortUsed)
	short := BalanceItem{LeaveType: TypeShort, Entitlement: ShortLeavePerMonth, Used: float64(shortUsed), Remaining: &remaining}
	return Balance{Year: year, Items: items, ShortLeaveMonth: short}, nil
}

// AffectedPeriods lists the dated timetable periods an application would
// miss, so the teacher can name a relief teacher for each.
func (s *Service) AffectedPeriods(ctx context.Context, teacherID uuid.UUID, req ApplyRequest) (AffectedPeriods, error) {
	req.Relief = nil
	app, err := parseApplication(teacherID, req)
	if err != nil {
		return AffectedPeriods{}, invalid(err)
	}
	if _, err := chargedDays(app); err != nil {
		return AffectedPeriods{}, invalid(err)
	}
	yearID, err := s.years.CurrentAcademicYearID(ctx)
	if errors.Is(err, pgx.ErrNoRows) {
		return AffectedPeriods{Items: []AffectedPeriod{}}, nil
	}
	if err != nil {
		return AffectedPeriods{}, err
	}
	slots, err := s.store.teacherPeriods(ctx, teacherID, yearID)
	if err != nil {
		return AffectedPeriods{}, err
	}
	return expandPeriods(app, slots), nil
}

func expandPeriods(app Application, slots []periodSlot) AffectedPeriods {
	out := AffectedPeriods{Items: []AffectedPeriod{}}
	days := 0
	for d := app.Start; !d.After(app.End); d = d.AddDate(0, 0, 1) {
		dow := schoolDayOfWeek(d)
		if dow == 0 {
			continue
		}
		if days == MaxReliefDays {
			out.Truncated = true
			break
		}
		days++
		for _, slot := range slots {
			if slot.DayOfWeek != dow || !coversPeriod(app, slot) {
				continue
			}
			out.Items = append(out.Items, AffectedPeriod{
				Date: d.Format(time.DateOnly), PeriodNumber: slot.PeriodNumber, StartTime: slot.StartTime, EndTime: slot.EndTime,
				ClassID: slot.ClassID, ClassName: slot.ClassName, SubjectID: optionalID(slot.SubjectID), SubjectName: slot.SubjectName,
			})
		}
	}
	return out
}

// ReliefCandidates lists teachers free to take a period on a date.
func (s *Service) ReliefCandidates(ctx context.Context, date time.Time, period int16, exclude uuid.UUID) ([]ReliefCandidate, error) {
	dow := schoolDayOfWeek(date)
	if dow == 0 {
		return []ReliefCandidate{}, nil
	}
	yearID, err := s.years.CurrentAcademicYearID(ctx)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	return s.store.reliefCandidates(ctx, date, dow, period, yearID, exclude)
}

// MyReliefDuties lists the approved relief periods a teacher covers from a date.
func (s *Service) MyReliefDuties(ctx context.Context, teacherID uuid.UUID, from time.Time) ([]ReliefDuty, error) {
	return s.store.reliefDuties(ctx, teacherID, from)
}

// Detail returns an application to its applicant or to an approver.
func (s *Service) Detail(ctx context.Context, actor Actor, id uuid.UUID) (RequestDetail, error) {
	detail, err := s.detail(ctx, id)
	if err != nil {
		return RequestDetail{}, err
	}
	if actor.TeacherID != uuid.Nil && actor.TeacherID == detail.TeacherID {
		return detail, nil
	}
	if _, err := s.approverRank(ctx, actor); err != nil {
		return RequestDetail{}, err
	}
	return detail, nil
}

// Register is the school's leave register for approvers.
func (s *Service) Register(ctx context.Context, actor Actor, filter RegisterFilter) (RequestPage, error) {
	if _, err := s.approverRank(ctx, actor); err != nil {
		return RequestPage{}, err
	}
	return s.store.list(ctx, filter)
}

// Balances is every active teacher's approved leave for a year.
func (s *Service) Balances(ctx context.Context, actor Actor, year int, search string, limit, offset int32) (BalancePage, error) {
	if _, err := s.approverRank(ctx, actor); err != nil {
		return BalancePage{}, err
	}
	return s.store.balances(ctx, year, search, limit, offset)
}

// DailyRelief is the relief sheet for one date.
func (s *Service) DailyRelief(ctx context.Context, actor Actor, date time.Time) ([]DailyRelief, error) {
	if _, err := s.approverRank(ctx, actor); err != nil {
		return nil, err
	}
	return s.store.reliefForDate(ctx, date)
}

// Decide approves or rejects a pending application. Approval marks each
// leave day on the staff attendance register and tells the applicant and
// the relief teachers; rejection tells the applicant.
func (s *Service) Decide(ctx context.Context, actor Actor, id uuid.UUID, approve bool, note string) (RequestDetail, error) {
	rank, err := s.approverRank(ctx, actor)
	if err != nil {
		return RequestDetail{}, err
	}
	detail, err := s.detail(ctx, id)
	if err != nil {
		return RequestDetail{}, err
	}
	if err := s.mayDecide(ctx, actor, rank, detail.Request); err != nil {
		return RequestDetail{}, err
	}
	status := StatusApproved
	if !approve {
		if note == "" {
			return RequestDetail{}, invalid(ErrNoteRequired)
		}
		status = StatusRejected
	}
	count, err := s.store.decide(ctx, id, status, actor.UserID, note)
	if err != nil {
		return RequestDetail{}, err
	}
	if count == 0 {
		return RequestDetail{}, ErrNotPending
	}
	if s.audit != nil {
		_ = s.audit.Record(ctx, "teacher_leave", id, status, actor.UserID, detail.Request, struct {
			Status string `json:"status"`
			Note   string `json:"note"`
		}{status, note}, "")
	}
	if approve {
		s.afterApproval(ctx, actor.UserID, detail)
	} else {
		s.send(ctx, "Leave not approved", fmt.Sprintf("Your %s leave (%s) was not approved: %s", typeLabel(detail.LeaveType), dateSpan(detail.Request), note), actor.UserID, []uuid.UUID{detail.teacherUserID})
	}
	return s.detail(ctx, id)
}

func (s *Service) mayDecide(ctx context.Context, actor Actor, rank ApproverRank, request Request) error {
	if request.Status != StatusPending {
		return ErrNotPending
	}
	if actor.Admin {
		return nil
	}
	if actor.TeacherID == request.TeacherID {
		return ErrOwnLeave
	}
	applicantRank, err := s.approvers.LeaveRank(ctx, request.TeacherID)
	if err != nil {
		return err
	}
	if applicantRank == Principal {
		return ErrPrincipalLeave
	}
	if applicantRank == VicePrincipal && rank != Principal {
		return ErrForbidden
	}
	return nil
}

// afterApproval updates attendance and notifies; a failure here is logged
// rather than undoing an approval that has already been recorded.
func (s *Service) afterApproval(ctx context.Context, actorID uuid.UUID, detail RequestDetail) {
	if detail.LeaveType != TypeShort && detail.DayPart == DayFull && s.attendance != nil {
		start, _ := time.Parse(time.DateOnly, detail.StartDate)
		end, _ := time.Parse(time.DateOnly, detail.EndDate)
		note := fmt.Sprintf("Approved %s leave", typeLabel(detail.LeaveType))
		for d := start; !d.After(end); d = d.AddDate(0, 0, 1) {
			if !isWorkingDay(d) {
				continue
			}
			if err := s.attendance.MarkTeacherOnLeave(ctx, detail.TeacherID, d, note, actorID); err != nil {
				log.Printf("leave %s: mark attendance for %s: %v", detail.ID, d.Format(time.DateOnly), err)
			}
		}
	}
	s.send(ctx, "Leave approved", fmt.Sprintf("Your %s leave (%s) was approved.", typeLabel(detail.LeaveType), dateSpan(detail.Request)), actorID, []uuid.UUID{detail.teacherUserID})

	relievers := map[uuid.UUID]bool{}
	for _, r := range detail.Relief {
		if r.ReliefTeacherID != nil {
			relievers[*r.ReliefTeacherID] = true
		}
	}
	if detail.ActingTeacherID != nil {
		relievers[*detail.ActingTeacherID] = true
	}
	if len(relievers) == 0 {
		return
	}
	ids := make([]uuid.UUID, 0, len(relievers))
	for id := range relievers {
		ids = append(ids, id)
	}
	users, err := s.store.userIDsForTeachers(ctx, ids)
	if err != nil {
		log.Printf("leave %s: resolve relief teachers: %v", detail.ID, err)
		return
	}
	s.send(ctx, "Relief duty", fmt.Sprintf("You are covering for %s while they are on leave (%s). See My Leave for your periods.", detail.TeacherName, dateSpan(detail.Request)), actorID, users)
}

func (s *Service) send(ctx context.Context, title, message string, createdBy uuid.UUID, users []uuid.UUID) {
	if s.notify == nil || len(users) == 0 {
		return
	}
	if err := s.notify.SendDirect(ctx, title, message, "general", "normal", createdBy, users); err != nil {
		log.Printf("leave: notify %q: %v", title, err)
	}
}

func (s *Service) approverRank(ctx context.Context, actor Actor) (ApproverRank, error) {
	if actor.Admin {
		return Principal, nil
	}
	if actor.TeacherID == uuid.Nil {
		return NotApprover, ErrForbidden
	}
	rank, err := s.approvers.LeaveRank(ctx, actor.TeacherID)
	if err != nil {
		return NotApprover, err
	}
	if rank == NotApprover {
		return NotApprover, ErrForbidden
	}
	return rank, nil
}

func (s *Service) detail(ctx context.Context, id uuid.UUID) (RequestDetail, error) {
	request, err := s.store.get(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return RequestDetail{}, ErrNotFound
	}
	if err != nil {
		return RequestDetail{}, err
	}
	relief, err := s.store.relief(ctx, id)
	if err != nil {
		return RequestDetail{}, err
	}
	return RequestDetail{Request: request, Relief: relief}, nil
}

func parseApplication(teacherID uuid.UUID, req ApplyRequest) (Application, error) {
	start, err := time.Parse(time.DateOnly, req.StartDate)
	if err != nil {
		return Application{}, errors.New("invalid start date (expected YYYY-MM-DD)")
	}
	end, err := time.Parse(time.DateOnly, req.EndDate)
	if err != nil {
		return Application{}, errors.New("invalid end date (expected YYYY-MM-DD)")
	}
	app := Application{
		TeacherID: teacherID, LeaveType: req.LeaveType, DayPart: req.DayPart, Start: start, End: end,
		StartTime: normalizeClock(req.StartTime), EndTime: normalizeClock(req.EndTime), Reason: req.Reason,
	}
	if app.DayPart == "" {
		app.DayPart = DayFull
	}
	if req.ActingTeacherID != "" {
		if app.ActingTeacherID, err = uuid.Parse(req.ActingTeacherID); err != nil {
			return Application{}, errors.New("invalid acting teacher id")
		}
		if app.ActingTeacherID == teacherID {
			return Application{}, ErrActingIsSelf
		}
	}
	for _, input := range req.Relief {
		relief, err := parseRelief(teacherID, start, end, input)
		if err != nil {
			return Application{}, err
		}
		app.Relief = append(app.Relief, relief)
	}
	return app, nil
}

func parseRelief(teacherID uuid.UUID, start, end time.Time, input ReliefInput) (Relief, error) {
	date, err := time.Parse(time.DateOnly, input.Date)
	if err != nil {
		return Relief{}, errors.New("invalid relief date (expected YYYY-MM-DD)")
	}
	if date.Before(start) || date.After(end) {
		return Relief{}, ErrReliefOutsideLeave
	}
	relief := Relief{Date: date, PeriodNumber: input.PeriodNumber}
	if relief.ClassID, err = uuid.Parse(input.ClassID); err != nil {
		return Relief{}, errors.New("invalid relief class id")
	}
	if input.SubjectID != "" {
		if relief.SubjectID, err = uuid.Parse(input.SubjectID); err != nil {
			return Relief{}, errors.New("invalid relief subject id")
		}
	}
	if input.ReliefTeacherID != "" {
		if relief.ReliefTeacherID, err = uuid.Parse(input.ReliefTeacherID); err != nil {
			return Relief{}, errors.New("invalid relief teacher id")
		}
		if relief.ReliefTeacherID == teacherID {
			return Relief{}, ErrReliefIsSelf
		}
	}
	return relief, nil
}

func dateSpan(r Request) string {
	switch {
	case r.LeaveType == TypeShort:
		return fmt.Sprintf("%s, %s-%s", r.StartDate, r.StartTime, r.EndTime)
	case r.DayPart != DayFull:
		return fmt.Sprintf("%s, %s", r.StartDate, r.DayPart)
	case r.StartDate == r.EndDate:
		return r.StartDate
	}
	return fmt.Sprintf("%s to %s", r.StartDate, r.EndDate)
}

func optionalID(id uuid.UUID) *uuid.UUID {
	if id == uuid.Nil {
		return nil
	}
	return &id
}
