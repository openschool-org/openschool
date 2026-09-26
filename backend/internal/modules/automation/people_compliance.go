package automation

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/openschool-org/openschool/internal/authz"
	"github.com/openschool-org/openschool/internal/modules/notifications"
)

// PeopleComplianceAgentName is this agent's stable job_settings/job_runs identifier.
const PeopleComplianceAgentName = "people_compliance_agent"

// staleProvisioningBaseDays is the floor age at which a still-must-change-password account is worth mentioning at all.
const staleProvisioningBaseDays = 14

// staleProvisioningElevatedDays and staleProvisioningCriticalDays escalate an onboarding finding's severity the longer an account sits unused.
const (
	staleProvisioningElevatedDays = 30
	staleProvisioningCriticalDays = 60
)

// PeopleComplianceAgent runs four concurrent checks about the people side of the school's data: employment consistency, guardian coverage, and onboarding completion.
type PeopleComplianceAgent struct {
	checks   *Repository
	notifSvc *notifications.NotificationService
}

// NewPeopleComplianceAgent constructs a PeopleComplianceAgent with its dependencies.
func NewPeopleComplianceAgent(checks *Repository, notifSvc *notifications.NotificationService) *PeopleComplianceAgent {
	return &PeopleComplianceAgent{checks: checks, notifSvc: notifSvc}
}

// Name returns this agent's job_settings/job_runs identifier.
func (a *PeopleComplianceAgent) Name() string { return PeopleComplianceAgentName }

// Schedule returns this agent's cron expression: daily 05:00.
func (a *PeopleComplianceAgent) Schedule() string { return "0 5 * * *" }

// Description returns the one-line summary shown on the Automation panel.
func (a *PeopleComplianceAgent) Description() string {
	return "Runs four people-compliance checks concurrently: inactive teachers still assigned, students with no guardian, and teacher/student accounts stuck in first-login setup (age-tiered severity)."
}

// Run executes all four checks concurrently and aggregates their results.
func (a *PeopleComplianceAgent) Run(ctx context.Context) (Result, error) {
	return runChecks(ctx,
		a.checkEmploymentConsistency,
		a.checkZeroGuardians,
		func(ctx context.Context) checkOutcome { return a.checkOnboarding(ctx, authz.RoleTeacher, "teacher") },
		func(ctx context.Context) checkOutcome { return a.checkOnboarding(ctx, authz.RoleStudent, "student") },
	)
}

// checkEmploymentConsistency flags resigned/transferred teachers still assigned as a form or subject teacher on a current-year class.
func (a *PeopleComplianceAgent) checkEmploymentConsistency(ctx context.Context) checkOutcome {
	teachers, err := a.checks.ListInactiveTeachersStillAssigned(ctx)
	if err != nil {
		return checkOutcome{err: fmt.Errorf("employment-consistency check: %w", err)}
	}
	if len(teachers) == 0 {
		return checkOutcome{}
	}

	names := make([]string, len(teachers))
	for i, t := range teachers {
		names[i] = fmt.Sprintf("%s (%s)", t.FullName, t.EmploymentStatus)
	}
	summary := fmt.Sprintf("%d teacher(s) still assigned despite employment status: %s", len(teachers), strings.Join(names, ", "))

	if err := notifyAdmins(ctx, a.checks, a.notifSvc, "Inactive teachers still assigned to classes",
		summary, "general", SeverityElevated); err != nil {
		return checkOutcome{findings: len(teachers), label: fmt.Sprintf("%d inactive teacher(s) still assigned", len(teachers)), err: fmt.Errorf("found %d teacher(s) but failed to notify admins: %w", len(teachers), err)}
	}
	return checkOutcome{findings: len(teachers), label: fmt.Sprintf("%d inactive teacher(s) still assigned", len(teachers))}
}

// checkZeroGuardians flags active students with zero guardians on file.
func (a *PeopleComplianceAgent) checkZeroGuardians(ctx context.Context) checkOutcome {
	students, err := a.checks.ListActiveStudentsWithoutGuardian(ctx)
	if err != nil {
		return checkOutcome{err: fmt.Errorf("zero-guardian check: %w", err)}
	}
	if len(students) == 0 {
		return checkOutcome{}
	}

	names := make([]string, len(students))
	for i, s := range students {
		names[i] = fmt.Sprintf("%s (%s)", s.FullName, s.IndexNumber)
	}
	summary := fmt.Sprintf("%d active student(s) with no guardian on file: %s", len(students), strings.Join(names, ", "))

	if err := notifyAdmins(ctx, a.checks, a.notifSvc, "Students with no guardian on file",
		summary, "general", SeverityElevated); err != nil {
		return checkOutcome{findings: len(students), label: fmt.Sprintf("%d student(s) with no guardian", len(students)), err: fmt.Errorf("found %d student(s) but failed to notify admins: %w", len(students), err)}
	}
	return checkOutcome{findings: len(students), label: fmt.Sprintf("%d student(s) with no guardian", len(students))}
}

// checkOnboarding flags accounts of the given role stuck on first-login setup, escalating severity as account age grows.
func (a *PeopleComplianceAgent) checkOnboarding(ctx context.Context, role, label string) checkOutcome {
	stale, err := a.checks.ListStaleMustChangePasswordUsersByRole(ctx, role, staleProvisioningBaseDays)
	if err != nil {
		return checkOutcome{err: fmt.Errorf("%s onboarding check: %w", label, err)}
	}
	if len(stale) == 0 {
		return checkOutcome{}
	}

	// Severity escalates to the oldest account in the batch, since one account stuck 60+ days makes the whole finding worth "important".
	severity := SeverityLow
	now := time.Now()
	names := make([]string, len(stale))
	for i, u := range stale {
		age := now.Sub(u.CreatedAt)
		switch {
		case age >= staleProvisioningCriticalDays*24*time.Hour:
			severity = SeverityCritical
			names[i] = fmt.Sprintf("%s (%s, %dd)", u.FullName, u.Email, int(age.Hours()/24))
		case age >= staleProvisioningElevatedDays*24*time.Hour:
			if severity != SeverityCritical {
				severity = SeverityElevated
			}
			names[i] = fmt.Sprintf("%s (%s, %dd)", u.FullName, u.Email, int(age.Hours()/24))
		default:
			names[i] = fmt.Sprintf("%s (%s)", u.FullName, u.Email)
		}
	}
	summary := fmt.Sprintf("%d %s account(s) never completed first login: %s", len(stale), label, strings.Join(names, ", "))

	title := strings.ToUpper(label[:1]) + label[1:] + " accounts stuck in first-login setup"
	if err := notifyAdmins(ctx, a.checks, a.notifSvc, title, summary, "general", severity); err != nil {
		return checkOutcome{findings: len(stale), label: fmt.Sprintf("%d %s account(s) stuck onboarding", len(stale), label), err: fmt.Errorf("found %d account(s) but failed to notify admins: %w", len(stale), err)}
	}
	return checkOutcome{findings: len(stale), label: fmt.Sprintf("%d %s account(s) stuck onboarding", len(stale), label)}
}

// Title is the agent's name on the Automation panel.
func (a *PeopleComplianceAgent) Title() string { return "People compliance" }

// CanDisable reports whether an admin may switch this agent off.
func (a *PeopleComplianceAgent) CanDisable() bool { return true }

// Checks lists what this agent checks and where each finding is shown.
func (a *PeopleComplianceAgent) Checks() []CheckInfo {
	return []CheckInfo{
		{Key: "inactive_teachers", Title: "No inactive teachers on classes", Description: "Teachers who left or are on leave are not still form or subject teachers.", FindingTitle: "Inactive teachers still assigned to classes", Pages: []string{"/teachers", "/classes"}},
		{Key: "zero_guardians", Title: "Students have a guardian", Description: "Every active student has at least one guardian on file.", FindingTitle: "Students with no guardian on file", Pages: []string{"/students"}},
		{Key: "teacher_onboarding", Title: "Teachers finished first sign-in", Description: "Teacher accounts are not stuck in first-login setup.", FindingTitle: "Teacher accounts stuck in first-login setup", Pages: []string{"/teachers"}},
		{Key: "student_onboarding", Title: "Students finished first sign-in", Description: "Student accounts are not stuck in first-login setup.", FindingTitle: "Student accounts stuck in first-login setup", Pages: []string{"/students"}},
	}
}
