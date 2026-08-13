package jobs

import (
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/repositories"
	notificationrepositories "github.com/openschool-org/openschool/internal/repositories/notifications"
	timetablerepositories "github.com/openschool-org/openschool/internal/repositories/timetable"
	"github.com/openschool-org/openschool/internal/services/notifications"
)

// BuildAll constructs every known job with its dependencies wired in. This
// is the single place that lists every job that exists — adding a new one
// means writing its <name>.go file (implementing Job) and adding one line
// here; nothing else in the framework, the scheduler, or the admin API
// needs to change.
func BuildAll(pool *pgxpool.Pool) []Job {
	checks := repositories.NewJobChecksRepository(pool)

	// Same construction notifications.RegisterNotificationRoutes uses —
	// jobs reuse the normal notification pipeline (SendDirect) rather than
	// a separate delivery path.
	notifSvc := notifications.NewNotificationService(
		notificationrepositories.NewNotificationRepository(pool),
		repositories.NewClassRepository(pool),
		timetablerepositories.NewGradeSectionRepository(pool),
		repositories.NewSectionHeadRepository(pool),
		repositories.NewTeacherRepository(pool),
		repositories.NewStudentRepository(pool),
		repositories.NewGuardianRepository(pool),
		repositories.NewSchoolRepository(pool),
		repositories.NewPositionRepository(pool),
	)

	return []Job{
		NewBackupJob(pool),
		NewCurrentAcademicYearInvariantJob(checks, notifSvc),
		NewGenderSchoolTypeJob(checks, notifSvc),
		NewUnclassedStudentJob(checks, notifSvc),
		NewEmptyGradeJob(checks, notifSvc),
		NewEmptyStreamJob(checks, notifSvc),
		NewZeroGuardianJob(checks, notifSvc),
		NewEmploymentConsistencyJob(checks, notifSvc),
		NewMissingAttendanceSessionJob(checks, notifSvc),
		NewTermMarksDeadlineJob(checks, notifSvc),
		NewStaleAttendanceJob(checks, notifSvc),
		NewTeacherOnboardingJob(checks, notifSvc),
		NewStudentOnboardingJob(checks, notifSvc),
		NewPasswordResetTokenSweepJob(checks),
		NewAuditAnomalyJob(checks, notifSvc),
	}
}
