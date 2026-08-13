package jobs

import (
	"context"
	"fmt"
	"strings"

	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services/notifications"
)

const (
	TeacherOnboardingJobName = "teacher_onboarding_watcher"
	StudentOnboardingJobName = "student_onboarding_watcher"
)

// staleProvisioningDays is how long an account can sit with
// must_change_password still true before it's flagged as likely stuck in
// onboarding rather than just not-logged-in-yet-today.
const staleProvisioningDays = 14

// onboardingJob is shared by the teacher- and student-scoped watchers below
// — same query, same notification shape, only the role and display name
// differ. Splitting the original combined password-lifecycle job by role
// (rather than one job listing every stuck account regardless of role) is
// what lets each watcher's finding show correctly on its own role-specific
// page (Teachers vs Students) instead of a mixed list that would be
// misleading on either.
type onboardingJob struct {
	name     string
	role     string
	label    string
	checks   *repositories.JobChecksRepository
	notifSvc *notifications.NotificationService
}

func (j *onboardingJob) Name() string { return j.name }
func (j *onboardingJob) Schedule() string {
	return "0 7 * * 1" // weekly, Monday 07:00
}
func (j *onboardingJob) Description() string {
	return fmt.Sprintf("Flags %s accounts still stuck on first-login setup after %d days.", j.label, staleProvisioningDays)
}

func (j *onboardingJob) Run(ctx context.Context) (Result, error) {
	stale, err := j.checks.ListStaleMustChangePasswordUsersByRole(ctx, j.role, staleProvisioningDays)
	if err != nil {
		return Result{}, err
	}
	if len(stale) == 0 {
		return Result{Summary: fmt.Sprintf("no %s accounts stuck in onboarding", j.label), Findings: 0}, nil
	}

	names := make([]string, len(stale))
	for i, u := range stale {
		names[i] = fmt.Sprintf("%s (%s)", u.FullName, u.Email)
	}
	summary := fmt.Sprintf("%d %s account(s) never completed first login: %s", len(stale), j.label, strings.Join(names, ", "))

	title := strings.ToUpper(j.label[:1]) + j.label[1:] + " accounts stuck in first-login setup"
	if err := notifyAdmins(ctx, j.checks, j.notifSvc, title,
		summary, "general"); err != nil {
		return Result{Summary: summary, Findings: len(stale)}, fmt.Errorf("found %d account(s) but failed to notify admins: %w", len(stale), err)
	}
	return Result{Summary: summary, Findings: len(stale)}, nil
}

// NewTeacherOnboardingJob and NewStudentOnboardingJob are two thirds of the
// original § Proposed — maintenance/ops agents item 8 (docs/plan.md),
// split by role — see onboardingJob's doc comment for why.

func NewTeacherOnboardingJob(checks *repositories.JobChecksRepository, notifSvc *notifications.NotificationService) Job {
	return &onboardingJob{name: TeacherOnboardingJobName, role: models.RoleTeacher, label: "teacher", checks: checks, notifSvc: notifSvc}
}

func NewStudentOnboardingJob(checks *repositories.JobChecksRepository, notifSvc *notifications.NotificationService) Job {
	return &onboardingJob{name: StudentOnboardingJobName, role: models.RoleStudent, label: "student", checks: checks, notifSvc: notifSvc}
}
