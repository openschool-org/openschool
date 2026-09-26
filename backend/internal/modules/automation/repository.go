package automation

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

// maxRunsPerJob bounds persisted history for frequently running checks.
const maxRunsPerJob = 50

// Repository is Automation's only sqlc adapter. It owns both the read-only
// operational checks and scheduler settings/run-history persistence.
//
// The check queries are intentionally grouped here: they support automated
// operational checks rather than the CRUD lifecycle of another domain.
//
// It wraps the ad-hoc, one-off queries in
// db/queries/job_checks.sql — each backs exactly one background job
// in this module, not a full entity's CRUD, so they're grouped here rather
// than split across the repositories each query's subject already has.
type Repository struct {
	queries *db.Queries
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{queries: db.New(pool)}
}

func (r *Repository) ListAdminUserIDs(ctx context.Context) ([]uuid.UUID, error) {
	return r.queries.ListAdminUserIDs(ctx)
}

// retentionCandidate is a left student whose retention window has elapsed
// and who hasn't already been anonymised (S11).
type retentionCandidate struct {
	ID       uuid.UUID
	UserID   uuid.UUID
	HasUser  bool
	FullName string
}

func (r *Repository) ListStudentsPastRetention(ctx context.Context, retentionYears int) ([]retentionCandidate, error) {
	rows, err := r.queries.ListStudentsPastRetention(ctx, int32(retentionYears))
	if err != nil {
		return nil, err
	}
	result := make([]retentionCandidate, len(rows))
	for i, row := range rows {
		result[i] = retentionCandidate{ID: row.ID, FullName: row.FullName}
		if row.UserID.Valid {
			result[i].UserID = uuid.UUID(row.UserID.Bytes)
			result[i].HasUser = true
		}
	}
	return result, nil
}

// AnonymizeStudentProfile scrubs a profile's personal data in place, keeping
// the row so historical marks/attendance stay attributable (S11).
func (r *Repository) AnonymizeStudentProfile(ctx context.Context, id uuid.UUID) error {
	return r.queries.AnonymizeStudentProfile(ctx, id)
}

// EraseStudentUser scrubs the local user row's PII and deactivates it, the
// same operation people.studentRepository.EraseUser performs for the manual
// "erase person" flow — duplicated rather than shared because db/sqlc may
// only be imported from a module's own repository.go.
func (r *Repository) EraseStudentUser(ctx context.Context, id uuid.UUID) error {
	if _, err := r.queries.UpdateUser(ctx, db.UpdateUserParams{
		ID: id, FullName: "Erased Student", Email: fmt.Sprintf("erased-%s@erased.invalid", id),
	}); err != nil {
		return err
	}
	_, err := r.queries.DeactivateUser(ctx, id)
	return err
}

// pendingErasure is a user whose local scrub and/or identity-provider
// deletion hasn't completed yet after its profile was already anonymised.
type pendingErasure struct {
	ID        uuid.UUID
	UserID    uuid.UUID
	LocalDone bool
	IdpDone   bool
}

// RecordPendingErasure upserts a retry record for userID: localDone/idpDone
// report what has been confirmed done *this attempt* — the query itself
// only ever moves either flag from false to true, so a later call that only
// retries the still-failing half can't un-mark the half that already
// succeeded. lastErr is freeform, for operator visibility only.
func (r *Repository) RecordPendingErasure(ctx context.Context, userID uuid.UUID, localDone, idpDone bool, lastErr string) error {
	return r.queries.UpsertPendingErasure(ctx, db.UpsertPendingErasureParams{
		UserID: userID, LocalDone: localDone, IdpDone: idpDone,
		LastError: pgtype.Text{String: lastErr, Valid: lastErr != ""},
	})
}

// ListPendingErasures returns up to limit not-yet-fully-completed erasure retries, oldest first.
func (r *Repository) ListPendingErasures(ctx context.Context, limit int32) ([]pendingErasure, error) {
	rows, err := r.queries.ListPendingErasures(ctx, limit)
	if err != nil {
		return nil, err
	}
	result := make([]pendingErasure, len(rows))
	for i, row := range rows {
		result[i] = pendingErasure{ID: row.ID, UserID: row.UserID, LocalDone: row.LocalDone, IdpDone: row.IdpDone}
	}
	return result, nil
}

// DeletePendingErasure removes a retry record once both steps have completed.
func (r *Repository) DeletePendingErasure(ctx context.Context, id uuid.UUID) error {
	return r.queries.DeletePendingErasure(ctx, id)
}

func (r *Repository) ListCurrentAcademicYears(ctx context.Context) ([]academicYear, error) {
	return mapRows(func() ([]db.AcademicYear, error) { return r.queries.ListCurrentAcademicYears(ctx) }, func(row db.AcademicYear) academicYear {
		return academicYear{Label: row.Label}
	})
}

func (r *Repository) ListGenderSchoolTypeMismatches(ctx context.Context) ([]personReference, error) {
	return mapRows(func() ([]db.ListGenderSchoolTypeMismatchesRow, error) {
		return r.queries.ListGenderSchoolTypeMismatches(ctx)
	}, func(row db.ListGenderSchoolTypeMismatchesRow) personReference {
		return personReference{FullName: row.FullName, IndexNumber: row.IndexNumber}
	})
}

func (r *Repository) ListActiveStudentsWithoutCurrentClass(ctx context.Context) ([]personReference, error) {
	return mapRows(func() ([]db.ListActiveStudentsWithoutCurrentClassRow, error) {
		return r.queries.ListActiveStudentsWithoutCurrentClass(ctx)
	}, func(row db.ListActiveStudentsWithoutCurrentClassRow) personReference {
		return personReference{FullName: row.FullName, IndexNumber: row.IndexNumber}
	})
}

func (r *Repository) ListGradesWithNoCurrentClasses(ctx context.Context) ([]namedReference, error) {
	return mapRows(func() ([]db.ListGradesWithNoCurrentClassesRow, error) {
		return r.queries.ListGradesWithNoCurrentClasses(ctx)
	}, func(row db.ListGradesWithNoCurrentClassesRow) namedReference {
		return namedReference{Name: row.Name}
	})
}

func (r *Repository) ListStreamsWithNoCurrentClasses(ctx context.Context) ([]namedReference, error) {
	return mapRows(func() ([]db.ListStreamsWithNoCurrentClassesRow, error) {
		return r.queries.ListStreamsWithNoCurrentClasses(ctx)
	}, func(row db.ListStreamsWithNoCurrentClassesRow) namedReference {
		return namedReference{Name: row.Name}
	})
}

func (r *Repository) ListActiveStudentsWithoutGuardian(ctx context.Context) ([]personReference, error) {
	return mapRows(func() ([]db.ListActiveStudentsWithoutGuardianRow, error) {
		return r.queries.ListActiveStudentsWithoutGuardian(ctx)
	}, func(row db.ListActiveStudentsWithoutGuardianRow) personReference {
		return personReference{FullName: row.FullName, IndexNumber: row.IndexNumber}
	})
}

func (r *Repository) ListInactiveTeachersStillAssigned(ctx context.Context) ([]teacherAssignment, error) {
	return mapRows(func() ([]db.ListInactiveTeachersStillAssignedRow, error) {
		return r.queries.ListInactiveTeachersStillAssigned(ctx)
	}, func(row db.ListInactiveTeachersStillAssignedRow) teacherAssignment {
		return teacherAssignment{FullName: row.FullName, EmploymentStatus: row.EmploymentStatus}
	})
}

func (r *Repository) ListCurrentYearClassesMissingTodaySession(ctx context.Context) ([]classReference, error) {
	return mapRows(func() ([]db.ListCurrentYearClassesMissingTodaySessionRow, error) {
		return r.queries.ListCurrentYearClassesMissingTodaySession(ctx)
	}, func(row db.ListCurrentYearClassesMissingTodaySessionRow) classReference {
		return classReference{Name: row.Name, GradeName: row.GradeName}
	})
}

func (r *Repository) ListTermsNearDeadlineWithNoMarks(ctx context.Context, withinDays int32) ([]termDeadline, error) {
	return mapRows(func() ([]db.ListTermsNearDeadlineWithNoMarksRow, error) {
		return r.queries.ListTermsNearDeadlineWithNoMarks(ctx, withinDays)
	}, func(row db.ListTermsNearDeadlineWithNoMarksRow) termDeadline {
		return termDeadline{Name: row.Name, EndDate: row.EndDate.Time, AcademicYearLabel: row.AcademicYearLabel}
	})
}

func (r *Repository) ListStaleIncompleteSessions(ctx context.Context, olderThanHours int32) ([]incompleteSession, error) {
	return mapRows(func() ([]db.ListStaleIncompleteSessionsRow, error) {
		return r.queries.ListStaleIncompleteSessions(ctx, olderThanHours)
	}, func(row db.ListStaleIncompleteSessionsRow) incompleteSession {
		return incompleteSession{ClassName: row.ClassName, Date: row.Date.Time, CreatedAt: row.CreatedAt.Time, RecordCount: row.RecordCount, RosterSize: row.RosterSize}
	})
}

func (r *Repository) ListStaleMustChangePasswordUsersByRole(ctx context.Context, role string, olderThanDays int32) ([]staleAccount, error) {
	return mapRows(func() ([]db.ListStaleMustChangePasswordUsersByRoleRow, error) {
		return r.queries.ListStaleMustChangePasswordUsersByRole(ctx, db.ListStaleMustChangePasswordUsersByRoleParams{Role: role, OlderThanDays: olderThanDays})
	}, func(row db.ListStaleMustChangePasswordUsersByRoleRow) staleAccount {
		return staleAccount{FullName: row.FullName, Email: row.Email, CreatedAt: row.CreatedAt.Time}
	})
}

func (r *Repository) DeleteExpiredPasswordResetTokens(ctx context.Context) (int64, error) {
	return r.queries.DeleteExpiredPasswordResetTokens(ctx)
}

func (r *Repository) ListOpenTermMarksProgress(ctx context.Context) ([]termMarksProgress, error) {
	return mapRows(func() ([]db.ListOpenTermMarksProgressRow, error) { return r.queries.ListOpenTermMarksProgress(ctx) }, func(row db.ListOpenTermMarksProgressRow) termMarksProgress {
		return termMarksProgress{Name: row.Name, StartDate: row.StartDate.Time, EndDate: row.EndDate.Time, AcademicYearLabel: row.AcademicYearLabel, EnrolledStudents: row.EnrolledStudents, StudentsWithMarks: row.StudentsWithMarks}
	})
}

func (r *Repository) ListClassAttendanceComplianceRecent(ctx context.Context, windowDays int32) ([]attendanceCompliance, error) {
	return mapRows(func() ([]db.ListClassAttendanceComplianceRecentRow, error) {
		return r.queries.ListClassAttendanceComplianceRecent(ctx, windowDays)
	}, func(row db.ListClassAttendanceComplianceRecentRow) attendanceCompliance {
		return attendanceCompliance{Name: row.Name, GradeName: row.GradeName, SessionsTaken: row.SessionsTaken, SchoolDaysInWindow: row.SchoolDaysInWindow}
	})
}

func (r *Repository) ListAuditActivityBaseline(ctx context.Context, baselineDays int32) ([]auditBaseline, error) {
	return mapRows(func() ([]db.ListAuditActivityBaselineRow, error) {
		return r.queries.ListAuditActivityBaseline(ctx, baselineDays)
	}, func(row db.ListAuditActivityBaselineRow) auditBaseline {
		return auditBaseline{ActorID: pgUUID(row.ActorID), FullName: row.FullName, MeanPerHour: row.MeanPerHour, StddevPerHour: row.StddevPerHour, HoursObserved: row.HoursObserved}
	})
}

func (r *Repository) ListCurrentHourAuditActivity(ctx context.Context) ([]auditActivity, error) {
	return mapRows(func() ([]db.ListCurrentHourAuditActivityRow, error) {
		return r.queries.ListCurrentHourAuditActivity(ctx)
	}, func(row db.ListCurrentHourAuditActivityRow) auditActivity {
		return auditActivity{ActorID: pgUUID(row.ActorID), FullName: row.FullName, ChangeCount: row.ChangeCount}
	})
}

func (r *Repository) ListOffHoursAuditActivity(ctx context.Context, minChanges int32) ([]offHoursActivity, error) {
	return mapRows(func() ([]db.ListOffHoursAuditActivityRow, error) {
		return r.queries.ListOffHoursAuditActivity(ctx, minChanges)
	}, func(row db.ListOffHoursAuditActivityRow) offHoursActivity {
		return offHoursActivity{FullName: row.FullName, ChangeCount: row.ChangeCount, FirstSeen: row.FirstSeen.Time, LastSeen: row.LastSeen.Time}
	})
}

// IsEnabled defaults to true when no setting exists so newly registered jobs
// begin running without requiring a seed migration.
func (r *Repository) IsEnabled(ctx context.Context, jobName string) (bool, error) {
	setting, err := r.queries.GetJobSetting(ctx, jobName)
	if err == pgx.ErrNoRows {
		return true, nil
	}
	if err != nil {
		return false, err
	}
	return setting.Enabled, nil
}

func (r *Repository) SetEnabled(ctx context.Context, jobName string, enabled bool) error {
	_, err := r.queries.SetJobEnabled(ctx, db.SetJobEnabledParams{JobName: jobName, Enabled: enabled})
	return err
}

func (r *Repository) ListSettings(ctx context.Context) ([]jobSetting, error) {
	return mapRows(func() ([]db.JobSetting, error) { return r.queries.ListJobSettings(ctx) }, func(row db.JobSetting) jobSetting {
		return jobSetting{JobName: row.JobName, Enabled: row.Enabled}
	})
}

func (r *Repository) StartRun(ctx context.Context, jobName string, startedAt time.Time) (jobRun, error) {
	row, err := r.queries.CreateJobRun(ctx, db.CreateJobRunParams{
		JobName:   jobName,
		StartedAt: pgtype.Timestamptz{Time: startedAt, Valid: true},
	})
	if err != nil {
		return jobRun{}, err
	}
	return mapJobRun(row), nil
}

// FinishRun records the outcome and keeps only the newest run history for the
// job, preventing an indefinitely growing operational table.
func (r *Repository) FinishRun(ctx context.Context, runID uuid.UUID, jobName string, finishedAt time.Time, status, summary string, findings int32) error {
	if err := r.queries.FinishJobRun(ctx, db.FinishJobRunParams{
		ID:         runID,
		FinishedAt: pgtype.Timestamptz{Time: finishedAt, Valid: true},
		Status:     status,
		Summary:    pgtype.Text{String: summary, Valid: summary != ""},
		Findings:   findings,
	}); err != nil {
		return err
	}
	return r.queries.PruneJobRuns(ctx, db.PruneJobRunsParams{JobName: jobName, Limit: maxRunsPerJob})
}

func (r *Repository) ListLatestRuns(ctx context.Context) ([]jobRun, error) {
	return mapRows(func() ([]db.JobRun, error) { return r.queries.ListLatestJobRuns(ctx) }, mapJobRun)
}

func mapJobRun(row db.JobRun) jobRun {
	run := jobRun{ID: row.ID, JobName: row.JobName, StartedAt: row.StartedAt.Time, Status: row.Status, Findings: row.Findings}
	if row.Summary.Valid {
		run.Summary = row.Summary.String
	}
	if row.FinishedAt.Valid {
		finishedAt := row.FinishedAt.Time
		run.FinishedAt = &finishedAt
	}
	return run
}

func pgUUID(value pgtype.UUID) uuid.UUID {
	if !value.Valid {
		return uuid.Nil
	}
	return uuid.UUID(value.Bytes)
}

func mapRows[T, U any](query func() ([]T, error), mapRow func(T) U) ([]U, error) {
	rows, err := query()
	if err != nil {
		return nil, err
	}
	result := make([]U, len(rows))
	for i, row := range rows {
		result[i] = mapRow(row)
	}
	return result, nil
}

func (r *Repository) ListUnreadFindingsByTitle(ctx context.Context, userID uuid.UUID, titles []string) ([]db.ListUnreadFindingsByTitleRow, error) {
	return r.queries.ListUnreadFindingsByTitle(ctx, db.ListUnreadFindingsByTitleParams{UserID: userID, Titles: titles})
}
