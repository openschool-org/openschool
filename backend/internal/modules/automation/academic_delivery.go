package automation

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/openschool-org/openschool/internal/modules/notifications"
)

// AcademicDeliveryAgentName is this agent's stable job_settings/job_runs identifier.
const AcademicDeliveryAgentName = "academic_delivery_agent"

// missingAttendanceElevatedThreshold is how many classes missing today's session at once suggests something systemic rather than routine.
const missingAttendanceElevatedThreshold = 3

// attendanceComplianceWindowDays/Threshold/MinSchoolDays tune the trailing session-taking compliance-rate check.
const (
	attendanceComplianceWindowDays    = 10
	attendanceComplianceThreshold     = 0.7
	attendanceComplianceMinSchoolDays = 5
)

// staleSessionAgeHours is how old an incomplete session must be before it counts as stale rather than still in progress.
const staleSessionAgeHours = 24

// staleElevatedDays/CriticalDays escalate a stale session's severity the longer it sits unfinished.
const (
	staleElevatedDays = 3
	staleCriticalDays = 7
)

// termDeadlineWindowDays is how close to a term's end_date zero-marks-entered starts being flagged as critical.
const termDeadlineWindowDays = 7

// paceMinTimeElapsedRatio is the minimum fraction of a term elapsed before its marks-entry pace is worth judging.
const paceMinTimeElapsedRatio = 0.3

// paceDeficitElevated/CriticalThreshold are how many percentage points behind a straight-line pace count as a nudge versus a clear warning.
const (
	paceDeficitElevatedThreshold = 0.4
	paceDeficitCriticalThreshold = 0.6
)

// AcademicDeliveryAgent runs five concurrent day-to-day academic-operations checks: attendance session coverage/compliance/completeness and term-marks deadline/pace.
type AcademicDeliveryAgent struct {
	checks   *Repository
	notifSvc *notifications.NotificationService
}

// NewAcademicDeliveryAgent constructs an AcademicDeliveryAgent with its dependencies.
func NewAcademicDeliveryAgent(checks *Repository, notifSvc *notifications.NotificationService) *AcademicDeliveryAgent {
	return &AcademicDeliveryAgent{checks: checks, notifSvc: notifSvc}
}

// Name returns this agent's job_settings/job_runs identifier.
func (a *AcademicDeliveryAgent) Name() string { return AcademicDeliveryAgentName }

// Schedule returns this agent's cron expression: weekdays at noon.
func (a *AcademicDeliveryAgent) Schedule() string { return "0 12 * * 1-5" }

// Description returns the one-line summary shown on the Automation panel.
func (a *AcademicDeliveryAgent) Description() string {
	return "Runs five academic-delivery checks concurrently: today's missing attendance sessions, trailing attendance compliance rate, stale incomplete sessions (age-tiered), and term-marks deadline plus pace-behind-schedule detection."
}

// Run executes all five checks concurrently and aggregates their results.
func (a *AcademicDeliveryAgent) Run(ctx context.Context) (Result, error) {
	return runChecks(ctx,
		a.checkMissingAttendanceToday,
		a.checkAttendanceCompliance,
		a.checkStaleAttendance,
		a.checkTermMarksDeadline,
		a.checkTermMarksPace,
	)
}

// checkMissingAttendanceToday flags classes with no attendance session taken yet today.
func (a *AcademicDeliveryAgent) checkMissingAttendanceToday(ctx context.Context) checkOutcome {
	classes, err := a.checks.ListCurrentYearClassesMissingTodaySession(ctx)
	if err != nil {
		return checkOutcome{err: fmt.Errorf("missing-attendance check: %w", err)}
	}
	if len(classes) == 0 {
		return checkOutcome{}
	}

	names := make([]string, len(classes))
	for i, c := range classes {
		names[i] = fmt.Sprintf("%s %s", c.GradeName, c.Name)
	}
	summary := fmt.Sprintf("%d class(es) with no attendance session today: %s", len(classes), strings.Join(names, ", "))

	severity := SeverityLow
	if len(classes) >= missingAttendanceElevatedThreshold {
		severity = SeverityElevated
	}

	if err := notifyAdmins(ctx, a.checks, a.notifSvc, "Classes missing today's attendance session",
		summary, "attendance", severity); err != nil {
		return checkOutcome{findings: len(classes), label: fmt.Sprintf("%d class(es) missing today's session", len(classes)), err: fmt.Errorf("found %d class(es) but failed to notify admins: %w", len(classes), err)}
	}
	return checkOutcome{findings: len(classes), label: fmt.Sprintf("%d class(es) missing today's session", len(classes))}
}

// checkAttendanceCompliance flags classes whose session-taking rate over the trailing window has fallen below threshold.
func (a *AcademicDeliveryAgent) checkAttendanceCompliance(ctx context.Context) checkOutcome {
	rows, err := a.checks.ListClassAttendanceComplianceRecent(ctx, attendanceComplianceWindowDays)
	if err != nil {
		return checkOutcome{err: fmt.Errorf("attendance-compliance check: %w", err)}
	}

	var flagged []string
	worstRate := 1.0
	for _, r := range rows {
		if r.SchoolDaysInWindow < attendanceComplianceMinSchoolDays {
			continue // window too young to be meaningful yet
		}
		rate := float64(r.SessionsTaken) / float64(r.SchoolDaysInWindow)
		if rate >= attendanceComplianceThreshold {
			continue
		}
		if rate < worstRate {
			worstRate = rate
		}
		flagged = append(flagged, fmt.Sprintf("%s %s (%d/%d days, %.0f%%)", r.GradeName, r.Name, r.SessionsTaken, r.SchoolDaysInWindow, rate*100))
	}
	if len(flagged) == 0 {
		return checkOutcome{}
	}

	summary := fmt.Sprintf("%d class(es) with attendance-taking below %.0f%% over the last %d school days: %s",
		len(flagged), attendanceComplianceThreshold*100, attendanceComplianceWindowDays, strings.Join(flagged, ", "))

	severity := SeverityElevated
	if worstRate < 0.5 {
		severity = SeverityCritical
	}

	if err := notifyAdmins(ctx, a.checks, a.notifSvc, "Classes with inconsistent attendance-taking",
		summary, "attendance", severity); err != nil {
		return checkOutcome{findings: len(flagged), label: fmt.Sprintf("%d class(es) with inconsistent attendance", len(flagged)), err: fmt.Errorf("found %d class(es) but failed to notify admins: %w", len(flagged), err)}
	}
	return checkOutcome{findings: len(flagged), label: fmt.Sprintf("%d class(es) with inconsistent attendance", len(flagged))}
}

// checkStaleAttendance flags attendance sessions older than the threshold with fewer records than the class roster, escalating severity with age.
func (a *AcademicDeliveryAgent) checkStaleAttendance(ctx context.Context) checkOutcome {
	sessions, err := a.checks.ListStaleIncompleteSessions(ctx, staleSessionAgeHours)
	if err != nil {
		return checkOutcome{err: fmt.Errorf("stale-attendance check: %w", err)}
	}
	if len(sessions) == 0 {
		return checkOutcome{}
	}

	severity := SeverityLow
	now := time.Now()
	descriptions := make([]string, len(sessions))
	for i, s := range sessions {
		age := now.Sub(s.CreatedAt)
		neverStarted := s.RecordCount == 0
		switch {
		case neverStarted || age >= staleCriticalDays*24*time.Hour:
			severity = SeverityCritical
		case age >= staleElevatedDays*24*time.Hour:
			if severity != SeverityCritical {
				severity = SeverityElevated
			}
		}
		descriptions[i] = fmt.Sprintf("%s on %s (%d/%d marked, %dd old)", s.ClassName, s.Date.Format("2006-01-02"), s.RecordCount, s.RosterSize, int(age.Hours()/24))
	}
	summary := fmt.Sprintf("%d stale incomplete session(s): %s", len(sessions), strings.Join(descriptions, ", "))

	if err := notifyAdmins(ctx, a.checks, a.notifSvc, "Incomplete attendance sessions",
		summary, "attendance", severity); err != nil {
		return checkOutcome{findings: len(sessions), label: fmt.Sprintf("%d stale attendance session(s)", len(sessions)), err: fmt.Errorf("found %d session(s) but failed to notify admins: %w", len(sessions), err)}
	}
	return checkOutcome{findings: len(sessions), label: fmt.Sprintf("%d stale attendance session(s)", len(sessions))}
}

// checkTermMarksDeadline flags terms within termDeadlineWindowDays of their lock date with zero marks entered anywhere.
func (a *AcademicDeliveryAgent) checkTermMarksDeadline(ctx context.Context) checkOutcome {
	terms, err := a.checks.ListTermsNearDeadlineWithNoMarks(ctx, termDeadlineWindowDays)
	if err != nil {
		return checkOutcome{err: fmt.Errorf("term-marks-deadline check: %w", err)}
	}
	if len(terms) == 0 {
		return checkOutcome{}
	}

	names := make([]string, len(terms))
	for i, t := range terms {
		names[i] = fmt.Sprintf("%s (%s, ends %s)", t.Name, t.AcademicYearLabel, t.EndDate.Format("2006-01-02"))
	}
	summary := fmt.Sprintf("%d term(s) near their deadline with zero marks entered: %s", len(terms), strings.Join(names, ", "))

	if err := notifyAdmins(ctx, a.checks, a.notifSvc, "Terms nearing deadline with no marks entered",
		summary, "academic", SeverityCritical); err != nil {
		return checkOutcome{findings: len(terms), label: fmt.Sprintf("%d term(s) at zero-marks deadline", len(terms)), err: fmt.Errorf("found %d term(s) but failed to notify admins: %w", len(terms), err)}
	}
	return checkOutcome{findings: len(terms), label: fmt.Sprintf("%d term(s) at zero-marks deadline", len(terms))}
}

// checkTermMarksPace flags terms whose marks-entry coverage is meaningfully behind a straight-line time-elapsed pace.
func (a *AcademicDeliveryAgent) checkTermMarksPace(ctx context.Context) checkOutcome {
	terms, err := a.checks.ListOpenTermMarksProgress(ctx)
	if err != nil {
		return checkOutcome{err: fmt.Errorf("term-marks-pace check: %w", err)}
	}

	today := time.Now()
	var flagged []string
	worstDeficit := 0.0
	for _, t := range terms {
		start, end := t.StartDate, t.EndDate
		totalDays := end.Sub(start).Hours() / 24
		if totalDays <= 0 || t.EnrolledStudents == 0 {
			continue
		}
		elapsedDays := today.Sub(start).Hours() / 24
		timeRatio := clamp01(elapsedDays / totalDays)
		coverageRatio := clamp01(float64(t.StudentsWithMarks) / float64(t.EnrolledStudents))
		deficit := timeRatio - coverageRatio

		daysRemaining := end.Sub(today).Hours() / 24
		alreadyCoveredByDeadlineCheck := t.StudentsWithMarks == 0 && daysRemaining <= termDeadlineWindowDays
		if timeRatio < paceMinTimeElapsedRatio || deficit < paceDeficitElevatedThreshold || alreadyCoveredByDeadlineCheck {
			continue
		}

		if deficit > worstDeficit {
			worstDeficit = deficit
		}
		flagged = append(flagged, fmt.Sprintf("%s (%s): %.0f%% of term elapsed, only %.0f%% of students have any mark",
			t.Name, t.AcademicYearLabel, timeRatio*100, coverageRatio*100))
	}
	if len(flagged) == 0 {
		return checkOutcome{}
	}

	summary := fmt.Sprintf("%d term(s) falling behind their marks-entry pace: %s", len(flagged), strings.Join(flagged, "; "))

	severity := SeverityElevated
	if worstDeficit >= paceDeficitCriticalThreshold {
		severity = SeverityCritical
	}

	if err := notifyAdmins(ctx, a.checks, a.notifSvc, "Terms falling behind on marks-entry pace",
		summary, "academic", severity); err != nil {
		return checkOutcome{findings: len(flagged), label: fmt.Sprintf("%d term(s) behind pace", len(flagged)), err: fmt.Errorf("found %d term(s) but failed to notify admins: %w", len(flagged), err)}
	}
	return checkOutcome{findings: len(flagged), label: fmt.Sprintf("%d term(s) behind pace", len(flagged))}
}

// clamp01 restricts v to the [0, 1] range.
func clamp01(v float64) float64 {
	if v < 0 {
		return 0
	}
	if v > 1 {
		return 1
	}
	return v
}

// Title is the agent's name on the Automation panel.
func (a *AcademicDeliveryAgent) Title() string { return "Academic delivery" }

// CanDisable reports whether an admin may switch this agent off.
func (a *AcademicDeliveryAgent) CanDisable() bool { return true }

// Checks lists what this agent checks and where each finding is shown.
func (a *AcademicDeliveryAgent) Checks() []CheckInfo {
	return []CheckInfo{
		{Key: "missing_attendance", Title: "Attendance taken today", Description: "Every class has an attendance session today.", FindingTitle: "Classes missing today's attendance session", Pages: []string{"/attendance"}},
		{Key: "attendance_compliance", Title: "Attendance taken regularly", Description: "Classes take attendance on most school days.", FindingTitle: "Classes with inconsistent attendance-taking", Pages: []string{"/attendance"}},
		{Key: "stale_attendance", Title: "Sessions are finished", Description: "Attendance sessions are not left half marked.", FindingTitle: "Incomplete attendance sessions", Pages: []string{"/attendance"}},
		{Key: "marks_deadline", Title: "Marks before the term ends", Description: "Terms close to their end date have marks entered.", FindingTitle: "Terms nearing deadline with no marks entered", Pages: []string{"/classes"}},
		{Key: "marks_pace", Title: "Marks entry on pace", Description: "Marks entry keeps up with how far the term has gone.", FindingTitle: "Terms falling behind on marks-entry pace", Pages: []string{"/classes"}},
	}
}
