package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/repositories"
	notificationsservices "github.com/openschool-org/openschool/internal/services/notifications"
)

// ErrNotAssignedToClass is returned when a teacher tries to create a session or mark attendance for a class they aren't the form teacher of, or don't teach any subject in.
var ErrNotAssignedToClass = errors.New("you are not assigned to teach this class")

// ErrSessionLocked is returned when a non-admin tries to edit an
// attendance session more than 24 hours after it was taken.
var ErrSessionLocked = errors.New("this attendance session is locked — more than 24 hours have passed since it was taken; ask an administrator to edit it")

// attendanceLockWindow is how long a session stays editable by the
// teacher who took it before requiring administrator override.
const attendanceLockWindow = 24 * time.Hour

type AttendanceService struct {
	repo          *repositories.AttendanceRepository
	userRepo      *repositories.UserRepository
	teacherRepo   *repositories.TeacherRepository
	classRepo     *repositories.ClassRepository
	studentRepo   *repositories.StudentRepository
	guardianRepo  *repositories.GuardianRepository
	notifications *notificationsservices.NotificationService
	audit         *AuditService
	positions     *PositionService
	schoolRepo    *repositories.SchoolRepository
}

func NewAttendanceService(
	repo *repositories.AttendanceRepository,
	userRepo *repositories.UserRepository,
	teacherRepo *repositories.TeacherRepository,
	classRepo *repositories.ClassRepository,
	studentRepo *repositories.StudentRepository,
	guardianRepo *repositories.GuardianRepository,
	notifications *notificationsservices.NotificationService,
	audit *AuditService,
	positions *PositionService,
	schoolRepo *repositories.SchoolRepository,
) *AttendanceService {
	return &AttendanceService{
		repo: repo, userRepo: userRepo, teacherRepo: teacherRepo, classRepo: classRepo,
		studentRepo: studentRepo, guardianRepo: guardianRepo, notifications: notifications, audit: audit,
		positions: positions, schoolRepo: schoolRepo,
	}
}

// authorizeTeacherForClass ensures the acting user, if a teacher, is the
// class's form teacher or teaches at least one subject in it. Admins bypass
// the check entirely.
func (s *AttendanceService) authorizeTeacherForClass(ctx context.Context, actor Actor, classID uuid.UUID) error {
	if actor.Role == models.RoleAdmin {
		return nil
	}

	teacher, err := s.teacherRepo.GetByUserID(ctx, actor.ID)
	if err != nil {
		return fmt.Errorf("only teachers assigned to a class can record its attendance")
	}

	assigned, err := s.classRepo.IsTeacherAssignedToClass(ctx, classID, teacher.ID)
	if err != nil {
		return err
	}
	if !assigned {
		return ErrNotAssignedToClass
	}
	return nil
}

// isLocked reports whether more than attendanceLockWindow has passed since
// the session was taken.
func isLocked(session db.AttendanceSession) bool {
	return time.Since(session.CreatedAt.Time) > attendanceLockWindow
}

// authenticated user creating the session (taken from jwt)
type Actor struct {
	ID       uuid.UUID
	Email    string
	FullName string
	Role     string
}

func (s *AttendanceService) CreateSession(ctx context.Context, actor Actor, req models.CreateAttendanceSessionRequest) (db.AttendanceSession, error) {
	classID, err := uuid.Parse(req.ClassID)
	if err != nil {
		return db.AttendanceSession{}, fmt.Errorf("invalid class id")
	}

	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		return db.AttendanceSession{}, fmt.Errorf("invalid date format, use YYYY-MM-DD")
	}

	if err := s.authorizeTeacherForClass(ctx, actor, classID); err != nil {
		return db.AttendanceSession{}, err
	}

	takenBy, err := s.resolveActingUser(ctx, actor)
	if err != nil {
		return db.AttendanceSession{}, err
	}

	_, err = s.repo.GetSessionByClassAndDate(ctx, classID, date)
	if err == nil {
		return db.AttendanceSession{}, fmt.Errorf("attendance session already exists for this class on this date")
	}

	return s.repo.CreateSession(ctx, classID, takenBy, date)
}

func (s *AttendanceService) resolveActingUser(ctx context.Context, actor Actor) (uuid.UUID, error) {
	if _, err := s.userRepo.GetByID(ctx, actor.ID); err == nil {
		return actor.ID, nil
	}

	if actor.Role == "" {
		return uuid.UUID{}, fmt.Errorf("cannot record attendance: signed-in user has no recognized role")
	}

	if existing, err := s.userRepo.GetByEmail(ctx, actor.Email); err == nil {
		return existing.ID, nil
	}

	fullName := actor.FullName
	if fullName == "" {
		fullName = actor.Email
	}

	created, err := s.userRepo.Create(ctx, db.CreateUserParams{
		ID:       actor.ID,
		Email:    actor.Email,
		FullName: fullName,
		Role:     actor.Role,
	})
	if err != nil {
		return uuid.UUID{}, fmt.Errorf("failed to provision acting user: %w", err)
	}

	return created.ID, nil
}

func (s *AttendanceService) GetSession(ctx context.Context, actor Actor, id uuid.UUID) (db.AttendanceSession, error) {
	session, err := s.repo.GetSessionByID(ctx, id)
	if err != nil {
		return db.AttendanceSession{}, fmt.Errorf("attendance session not found")
	}
	if err := s.authorizeTeacherForClass(ctx, actor, session.ClassID); err != nil {
		return db.AttendanceSession{}, err
	}
	return session, nil
}

func (s *AttendanceService) DeleteSession(ctx context.Context, actor Actor, id uuid.UUID) error {
	session, err := s.repo.GetSessionByID(ctx, id)
	if err != nil {
		return fmt.Errorf("attendance session not found")
	}
	if err := s.authorizeTeacherForClass(ctx, actor, session.ClassID); err != nil {
		return err
	}

	locked := isLocked(session)
	if locked && actor.Role != models.RoleAdmin {
		return ErrSessionLocked
	}

	if err := s.repo.DeleteSession(ctx, id); err != nil {
		return err
	}

	if locked && s.audit != nil {
		_ = s.audit.Record(ctx, "attendance_session", id, "deleted_after_lock", actor.ID, session, nil, "")
	}
	return nil
}

func (s *AttendanceService) ListSessionsByClass(ctx context.Context, actor Actor, classID uuid.UUID) ([]db.AttendanceSession, error) {
	if err := s.authorizeTeacherForClass(ctx, actor, classID); err != nil {
		return nil, err
	}
	return s.repo.ListSessionsByClass(ctx, classID)
}

// ListSessionsByDate is the cross-school attendance dashboard: requires admin or a leadership rank, narrowed to the caller's authorized grades at the SQL WHERE clause level; a plain Class/Subject Teacher gets ErrInsufficientRank, not an unscoped dump.
func (s *AttendanceService) ListSessionsByDate(ctx context.Context, actor Actor, dateStr string) ([]db.ListAttendanceSessionsByDateRow, error) {
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return nil, fmt.Errorf("invalid date format, use YYYY-MM-DD")
	}

	if actor.Role == models.RoleAdmin {
		return s.repo.ListSessionsByDate(ctx, date, nil)
	}

	teacher, err := s.teacherRepo.GetByUserID(ctx, actor.ID)
	if err != nil {
		return nil, ErrInsufficientRank
	}

	year, err := s.schoolRepo.GetCurrentAcademicYear(ctx)
	if err != nil {
		return nil, fmt.Errorf("no current academic year configured")
	}

	wholeSchool, gradeIDs, err := s.positions.LeadershipScope(ctx, teacher.ID, year.ID)
	if err != nil {
		return nil, err
	}
	if wholeSchool {
		return s.repo.ListSessionsByDate(ctx, date, nil)
	}
	if len(gradeIDs) == 0 {
		return []db.ListAttendanceSessionsByDateRow{}, nil
	}
	return s.repo.ListSessionsByDate(ctx, date, gradeIDs)
}

func (s *AttendanceService) MarkAttendance(ctx context.Context, actor Actor, sessionID uuid.UUID, req models.MarkAttendanceRequest) error {
	session, err := s.repo.GetSessionByID(ctx, sessionID)
	if err != nil {
		return fmt.Errorf("attendance session not found")
	}

	if err := s.authorizeTeacherForClass(ctx, actor, session.ClassID); err != nil {
		return err
	}

	locked := isLocked(session)
	if locked && actor.Role != models.RoleAdmin {
		return ErrSessionLocked
	}

	takenBy, err := s.resolveActingUser(ctx, actor)
	if err != nil {
		return err
	}

	// Batched once up front instead of one GetRecord call per student in
	// the loop below — a class of 40 students previously cost 40 extra
	// round-trips just to detect status transitions.
	existing, err := s.repo.ListRecordsBySession(ctx, sessionID)
	if err != nil {
		return fmt.Errorf("failed to load existing attendance records: %w", err)
	}
	previousByStudent := make(map[uuid.UUID]db.AttendanceRecord, len(existing))
	for _, r := range existing {
		previousByStudent[r.StudentID] = r
	}

	// Parsed and validated as a whole pass before any write — otherwise an
	// invalid record late in the list (bad status, bad UUID) would return an
	// error after earlier records in the same request had already been
	// written, leaving a partial, silently-inconsistent submission.
	type parsedRecord struct {
		studentID uuid.UUID
		status    string
		note      string
	}
	parsed := make([]parsedRecord, len(req.Records))
	for i, record := range req.Records {
		studentID, err := uuid.Parse(record.StudentID)
		if err != nil {
			return fmt.Errorf("invalid student id: %s", record.StudentID)
		}
		if record.Status != models.AttendanceStatusPresent && record.Status != models.AttendanceStatusAbsent && record.Status != models.AttendanceStatusLate && record.Status != models.AttendanceStatusExcused {
			return fmt.Errorf("invalid status: %s — must be present, absent, late or excused", record.Status)
		}
		parsed[i] = parsedRecord{studentID: studentID, status: record.Status, note: record.Note}
	}

	for _, record := range parsed {
		studentID := record.studentID
		previous, hadPrevious := previousByStudent[studentID]

		updated, err := s.repo.MarkAttendance(ctx, sessionID, studentID, record.status, record.note)
		if err != nil {
			return fmt.Errorf("failed to mark attendance for student %s: %w", studentID, err)
		}
		// Keeps a duplicate studentID later in the same request comparing
		// against what this loop just wrote, not the pre-request snapshot.
		previousByStudent[studentID] = updated

		if locked && s.audit != nil {
			_ = s.audit.Record(ctx, "attendance_record", updated.ID, "edited_after_lock", actor.ID, previous, updated, req.Reason)
		}

		becameAbsent := record.status == models.AttendanceStatusAbsent && (!hadPrevious || previous.Status != models.AttendanceStatusAbsent)
		if becameAbsent {
			s.notifyGuardiansOfAbsence(ctx, session, studentID, takenBy)
		}
	}

	return nil
}

// notifyGuardiansOfAbsence notifies the student's guardian(s) when newly marked absent; failures never block the attendance write itself.
func (s *AttendanceService) notifyGuardiansOfAbsence(ctx context.Context, session db.AttendanceSession, studentID, takenBy uuid.UUID) {
	guardianUserIDs, err := s.guardianRepo.ListGuardianUserIDsByStudentIDs(ctx, []uuid.UUID{studentID})
	if err != nil || len(guardianUserIDs) == 0 {
		return
	}

	student, err := s.studentRepo.GetByID(ctx, studentID)
	if err != nil {
		return
	}
	class, err := s.classRepo.GetByID(ctx, session.ClassID)
	if err != nil {
		return
	}

	title := "Absence recorded"
	message := fmt.Sprintf("%s was marked absent on %s in class %s.", student.FullName, session.Date.Time.Format("2006-01-02"), class.Name)

	_ = s.notifications.SendDirect(ctx, title, message, "attendance", "normal", takenBy, guardianUserIDs)
}

func (s *AttendanceService) ListBySession(ctx context.Context, actor Actor, sessionID uuid.UUID) ([]db.ListAttendanceBySessionRow, error) {
	session, err := s.repo.GetSessionByID(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("attendance session not found")
	}
	if err := s.authorizeTeacherForClass(ctx, actor, session.ClassID); err != nil {
		return nil, err
	}
	return s.repo.ListBySession(ctx, sessionID)
}

// authorizeTeacherForStudent ensures the acting user, if a teacher, teaches the student's current class; a student with no current class enrollment can't be verified against, so non-admins are denied.
func (s *AttendanceService) authorizeTeacherForStudent(ctx context.Context, actor Actor, studentID uuid.UUID) error {
	if actor.Role == models.RoleAdmin {
		return nil
	}
	class, err := s.classRepo.GetStudentCurrentClass(ctx, studentID)
	if err != nil {
		return ErrNotAssignedToClass
	}
	return s.authorizeTeacherForClass(ctx, actor, class.ID)
}

// ListByStudent is only for contexts that already verified access by other means (self/parent routes resolving studentID from the caller's own identity, not a free-form path param); the teacher/admin-facing route must use ListByStudentForTeacher instead, which enforces class assignment.
func (s *AttendanceService) ListByStudent(ctx context.Context, studentID uuid.UUID) ([]db.ListAttendanceByStudentRow, error) {
	return s.repo.ListByStudent(ctx, studentID)
}

func (s *AttendanceService) ListByStudentForTeacher(ctx context.Context, actor Actor, studentID uuid.UUID) ([]db.ListAttendanceByStudentRow, error) {
	if err := s.authorizeTeacherForStudent(ctx, actor, studentID); err != nil {
		return nil, err
	}
	return s.repo.ListByStudent(ctx, studentID)
}

func (s *AttendanceService) GetSummaryForTeacher(ctx context.Context, actor Actor, studentID uuid.UUID, classID uuid.UUID) (db.GetAttendanceSummaryByStudentRow, error) {
	if err := s.authorizeTeacherForClass(ctx, actor, classID); err != nil {
		return db.GetAttendanceSummaryByStudentRow{}, err
	}
	return s.repo.GetSummaryByStudent(ctx, studentID, classID)
}
