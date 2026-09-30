// Package attendance owns student-attendance sessions, records, access rules,
// locking, correction auditing, and absence notifications.
package attendance

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/openschool-org/openschool/internal/authz"
)

var (
	ErrNotAssignedToClass = errors.New("you are not assigned to teach this class")
	ErrSessionLocked      = errors.New("this attendance session is locked — more than 24 hours have passed since it was taken; ask an administrator to edit it")
	ErrInsufficientRank   = errors.New("this action requires a leadership position (Principal, Vice Principal, or Section Head)")
)

const lockWindow = 24 * time.Hour

type Actor struct {
	ID       uuid.UUID
	Email    string
	FullName string
	Role     string
}

type Session struct {
	ID        uuid.UUID          `json:"id"`
	ClassID   uuid.UUID          `json:"class_id"`
	TakenBy   uuid.UUID          `json:"taken_by"`
	Date      pgtype.Date        `json:"date"`
	CreatedAt pgtype.Timestamptz `json:"created_at"`
	// TakenByName is filled only when one session is fetched by id.
	TakenByName string `json:"taken_by_name,omitempty"`
}

type Record struct {
	ID        uuid.UUID   `json:"id"`
	SessionID uuid.UUID   `json:"session_id"`
	StudentID uuid.UUID   `json:"student_id"`
	Status    string      `json:"status"`
	Note      pgtype.Text `json:"note"`
}

type DailySession struct {
	Session
	ClassName     string `json:"class_name"`
	GradeName     string `json:"grade_name"`
	TeacherName   string `json:"teacher_name"`
	EnrolledCount int64  `json:"enrolled_count"`
	MarkedCount   int64  `json:"marked_count"`
}

type SessionRecord struct {
	Record
	StudentName  string `json:"student_name"`
	StudentIndex string `json:"student_index"`
}

type StudentRecord struct {
	Record
	SessionDate pgtype.Date `json:"session_date"`
	ClassName   string      `json:"class_name"`
}

type Summary struct {
	TotalDays int64 `json:"total_days"`
	Present   int64 `json:"present"`
	Absent    int64 `json:"absent"`
	Late      int64 `json:"late"`
	Excused   int64 `json:"excused"`
}

type ReportRow struct {
	ID           uuid.UUID   `json:"id"`
	StudentName  string      `json:"student_name"`
	StudentIndex string      `json:"student_index"`
	SessionDate  pgtype.Date `json:"session_date"`
	Status       string      `json:"status"`
	Note         pgtype.Text `json:"note"`
}

type store interface {
	createSession(context.Context, uuid.UUID, uuid.UUID, time.Time) (Session, error)
	getSession(context.Context, uuid.UUID) (Session, error)
	findSession(context.Context, uuid.UUID, time.Time) (Session, error)
	listSessionsByClass(context.Context, uuid.UUID) ([]Session, error)
	listSessionsByDate(context.Context, time.Time, []uuid.UUID) ([]DailySession, error)
	deleteSession(context.Context, uuid.UUID) error
	listRecords(context.Context, uuid.UUID) ([]Record, error)
	markBatch(context.Context, uuid.UUID, []MarkInput) ([]Record, error)
	listBySession(context.Context, uuid.UUID) ([]SessionRecord, error)
	listByStudent(context.Context, uuid.UUID) ([]StudentRecord, error)
	summary(context.Context, uuid.UUID, uuid.UUID) (Summary, error)
	userExists(context.Context, uuid.UUID) bool
	userByEmail(context.Context, string) (uuid.UUID, error)
	createUser(context.Context, Actor) (uuid.UUID, error)
	teacherByUser(context.Context, uuid.UUID) (uuid.UUID, error)
	teacherAssigned(context.Context, uuid.UUID, uuid.UUID) (bool, error)
	studentClass(context.Context, uuid.UUID) (uuid.UUID, error)
	guardianUsers(context.Context, uuid.UUID) ([]uuid.UUID, error)
	studentName(context.Context, uuid.UUID) (string, error)
	className(context.Context, uuid.UUID) (string, error)
	currentAcademicYear(context.Context) (uuid.UUID, error)
	listReportRows(context.Context, uuid.UUID, time.Time, time.Time) ([]ReportRow, error)
}

type Notifier interface {
	SendDirect(context.Context, string, string, string, string, uuid.UUID, []uuid.UUID) error
}

type Auditor interface {
	Record(context.Context, string, uuid.UUID, string, uuid.UUID, interface{}, interface{}, string) error
}

type Leadership interface {
	LeadershipScope(context.Context, uuid.UUID, uuid.UUID) (bool, []uuid.UUID, error)
}

type Reader interface {
	ListByStudent(context.Context, uuid.UUID) ([]StudentRecord, error)
}

type ReportReader interface {
	ListForClassInRange(context.Context, uuid.UUID, time.Time, time.Time) ([]ReportRow, error)
}

type Service struct {
	store      store
	notifier   Notifier
	auditor    Auditor
	leadership Leadership
	now        func() time.Time
}

func NewService(store store, notifier Notifier, auditor Auditor, leadership Leadership) *Service {
	return &Service{store: store, notifier: notifier, auditor: auditor, leadership: leadership, now: time.Now}
}

func NewReader(repo *Repository) Reader { return NewService(repo, nil, nil, nil) }

func (s *Service) authorizeClass(ctx context.Context, actor Actor, classID uuid.UUID) error {
	if actor.Role == authz.RoleAdmin {
		return nil
	}
	teacherID, err := s.store.teacherByUser(ctx, actor.ID)
	if err != nil {
		return fmt.Errorf("only teachers assigned to a class can record its attendance")
	}
	assigned, err := s.store.teacherAssigned(ctx, classID, teacherID)
	if err != nil {
		return err
	}
	if !assigned {
		return ErrNotAssignedToClass
	}
	return nil
}

func (s *Service) locked(session Session) bool {
	return s.now().Sub(session.CreatedAt.Time) > lockWindow
}

func (s *Service) CreateSession(ctx context.Context, actor Actor, req CreateAttendanceSessionRequest) (Session, error) {
	classID, err := uuid.Parse(req.ClassID)
	if err != nil {
		return Session{}, fmt.Errorf("invalid class id")
	}
	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		return Session{}, fmt.Errorf("invalid date format, use YYYY-MM-DD")
	}
	if err := s.authorizeClass(ctx, actor, classID); err != nil {
		return Session{}, err
	}
	takenBy, err := s.resolveActor(ctx, actor)
	if err != nil {
		return Session{}, err
	}
	if _, err := s.store.findSession(ctx, classID, date); err == nil {
		return Session{}, fmt.Errorf("attendance session already exists for this class on this date")
	}
	return s.store.createSession(ctx, classID, takenBy, date)
}

func (s *Service) resolveActor(ctx context.Context, actor Actor) (uuid.UUID, error) {
	if s.store.userExists(ctx, actor.ID) {
		return actor.ID, nil
	}
	if actor.Role == "" {
		return uuid.Nil, fmt.Errorf("cannot record attendance: signed-in user has no recognized role")
	}
	if id, err := s.store.userByEmail(ctx, actor.Email); err == nil {
		return id, nil
	}
	if actor.FullName == "" {
		actor.FullName = actor.Email
	}
	id, err := s.store.createUser(ctx, actor)
	if err != nil {
		return uuid.Nil, fmt.Errorf("failed to provision acting user: %w", err)
	}
	return id, nil
}

func (s *Service) GetSession(ctx context.Context, actor Actor, id uuid.UUID) (Session, error) {
	session, err := s.store.getSession(ctx, id)
	if err != nil {
		return Session{}, fmt.Errorf("attendance session not found")
	}
	if err := s.authorizeClass(ctx, actor, session.ClassID); err != nil {
		return Session{}, err
	}
	return session, nil
}

func (s *Service) DeleteSession(ctx context.Context, actor Actor, id uuid.UUID) error {
	session, err := s.store.getSession(ctx, id)
	if err != nil {
		return fmt.Errorf("attendance session not found")
	}
	if err := s.authorizeClass(ctx, actor, session.ClassID); err != nil {
		return err
	}
	locked := s.locked(session)
	if locked && actor.Role != authz.RoleAdmin {
		return ErrSessionLocked
	}
	if err := s.store.deleteSession(ctx, id); err != nil {
		return err
	}
	if locked && s.auditor != nil {
		_ = s.auditor.Record(ctx, "attendance_session", id, "deleted_after_lock", actor.ID, session, nil, "")
	}
	return nil
}

func (s *Service) ListSessionsByClass(ctx context.Context, actor Actor, classID uuid.UUID) ([]Session, error) {
	if err := s.authorizeClass(ctx, actor, classID); err != nil {
		return nil, err
	}
	return s.store.listSessionsByClass(ctx, classID)
}

func (s *Service) ListSessionsByDate(ctx context.Context, actor Actor, rawDate string) ([]DailySession, error) {
	date, err := time.Parse("2006-01-02", rawDate)
	if err != nil {
		return nil, fmt.Errorf("invalid date format, use YYYY-MM-DD")
	}
	if actor.Role == authz.RoleAdmin {
		return s.store.listSessionsByDate(ctx, date, nil)
	}
	teacherID, err := s.store.teacherByUser(ctx, actor.ID)
	if err != nil {
		return nil, ErrInsufficientRank
	}
	yearID, err := s.store.currentAcademicYear(ctx)
	if err != nil {
		return nil, fmt.Errorf("no current academic year configured")
	}
	if s.leadership == nil {
		return nil, ErrInsufficientRank
	}
	wholeSchool, gradeIDs, err := s.leadership.LeadershipScope(ctx, teacherID, yearID)
	if err != nil {
		return nil, err
	}
	if wholeSchool {
		return s.store.listSessionsByDate(ctx, date, nil)
	}
	if len(gradeIDs) == 0 {
		return []DailySession{}, nil
	}
	return s.store.listSessionsByDate(ctx, date, gradeIDs)
}

func (s *Service) MarkAttendance(ctx context.Context, actor Actor, sessionID uuid.UUID, req MarkAttendanceRequest) error {
	session, err := s.store.getSession(ctx, sessionID)
	if err != nil {
		return fmt.Errorf("attendance session not found")
	}
	if err := s.authorizeClass(ctx, actor, session.ClassID); err != nil {
		return err
	}
	locked := s.locked(session)
	if locked && actor.Role != authz.RoleAdmin {
		return ErrSessionLocked
	}
	takenBy, err := s.resolveActor(ctx, actor)
	if err != nil {
		return err
	}
	existing, err := s.store.listRecords(ctx, sessionID)
	if err != nil {
		return fmt.Errorf("failed to load existing attendance records: %w", err)
	}
	previous := make(map[uuid.UUID]Record, len(existing))
	for _, record := range existing {
		previous[record.StudentID] = record
	}
	batch := make([]MarkInput, len(req.Records))
	for i, record := range req.Records {
		studentID, err := uuid.Parse(record.StudentID)
		if err != nil {
			return fmt.Errorf("invalid student id: %s", record.StudentID)
		}
		if !validStatus(record.Status) {
			return fmt.Errorf("invalid status: %s — must be present, absent, late or excused", record.Status)
		}
		batch[i] = MarkInput{StudentID: studentID, Status: record.Status, Note: record.Note}
	}
	updated, err := s.store.markBatch(ctx, sessionID, batch)
	if err != nil {
		return fmt.Errorf("failed to mark attendance: %w", err)
	}
	for i, input := range batch {
		before, existed := previous[input.StudentID]
		previous[input.StudentID] = updated[i]
		if locked && s.auditor != nil {
			_ = s.auditor.Record(ctx, "attendance_record", updated[i].ID, "edited_after_lock", actor.ID, before, updated[i], req.Reason)
		}
		if input.Status == AttendanceStatusAbsent && (!existed || before.Status != AttendanceStatusAbsent) {
			s.notifyAbsent(ctx, session, input.StudentID, takenBy)
		}
	}
	return nil
}

func validStatus(status string) bool {
	return status == AttendanceStatusPresent || status == AttendanceStatusAbsent || status == AttendanceStatusLate || status == AttendanceStatusExcused
}

func (s *Service) notifyAbsent(ctx context.Context, session Session, studentID, takenBy uuid.UUID) {
	if s.notifier == nil {
		return
	}
	users, err := s.store.guardianUsers(ctx, studentID)
	if err != nil || len(users) == 0 {
		return
	}
	student, err := s.store.studentName(ctx, studentID)
	if err != nil {
		return
	}
	class, err := s.store.className(ctx, session.ClassID)
	if err != nil {
		return
	}
	message := fmt.Sprintf("%s was marked absent on %s in class %s.", student, session.Date.Time.Format("2006-01-02"), class)
	_ = s.notifier.SendDirect(ctx, "Absence recorded", message, "attendance", "normal", takenBy, users)
}

func (s *Service) ListBySession(ctx context.Context, actor Actor, sessionID uuid.UUID) ([]SessionRecord, error) {
	session, err := s.store.getSession(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("attendance session not found")
	}
	if err := s.authorizeClass(ctx, actor, session.ClassID); err != nil {
		return nil, err
	}
	return s.store.listBySession(ctx, sessionID)
}

func (s *Service) ListByStudent(ctx context.Context, studentID uuid.UUID) ([]StudentRecord, error) {
	return s.store.listByStudent(ctx, studentID)
}

func (s *Service) ListByStudentForTeacher(ctx context.Context, actor Actor, studentID uuid.UUID) ([]StudentRecord, error) {
	if actor.Role != authz.RoleAdmin {
		classID, err := s.store.studentClass(ctx, studentID)
		if err != nil {
			return nil, ErrNotAssignedToClass
		}
		if err := s.authorizeClass(ctx, actor, classID); err != nil {
			return nil, err
		}
	}
	return s.store.listByStudent(ctx, studentID)
}

func (s *Service) GetSummaryForTeacher(ctx context.Context, actor Actor, studentID, classID uuid.UUID) (Summary, error) {
	if err := s.authorizeClass(ctx, actor, classID); err != nil {
		return Summary{}, err
	}
	return s.store.summary(ctx, studentID, classID)
}

func (s *Service) ListForClassInRange(ctx context.Context, classID uuid.UUID, from, to time.Time) ([]ReportRow, error) {
	return s.store.listReportRows(ctx, classID, from, to)
}
