package automation

import (
	"context"
	"fmt"
	"strings"

	"github.com/openschool-org/openschool/internal/modules/notifications"
)

// StructuralIntegrityAgentName is this agent's stable job_settings/job_runs identifier.
const StructuralIntegrityAgentName = "structural_integrity_agent"

// unclassedElevatedThreshold is the finding count at which unclassed students stop being a routine trickle and become worth flagging as important.
const unclassedElevatedThreshold = 3

// StructuralIntegrityAgent runs five concurrent checks on whether the school's own structural data (academic year, curriculum, roster) still satisfies the invariants the rest of the app assumes.
type StructuralIntegrityAgent struct {
	checks   *Repository
	notifSvc *notifications.NotificationService
}

// NewStructuralIntegrityAgent constructs a StructuralIntegrityAgent with its dependencies.
func NewStructuralIntegrityAgent(checks *Repository, notifSvc *notifications.NotificationService) *StructuralIntegrityAgent {
	return &StructuralIntegrityAgent{checks: checks, notifSvc: notifSvc}
}

// Name returns this agent's job_settings/job_runs identifier.
func (a *StructuralIntegrityAgent) Name() string { return StructuralIntegrityAgentName }

// Schedule returns this agent's cron expression: daily 03:00.
func (a *StructuralIntegrityAgent) Schedule() string { return "0 3 * * *" }

// Description returns the one-line summary shown on the Automation panel.
func (a *StructuralIntegrityAgent) Description() string {
	return "Runs five structural-integrity checks concurrently: current-academic-year invariant, student gender vs. school type, empty grades/streams, and unclassed active students."
}

// Run executes all five checks concurrently and aggregates their results.
func (a *StructuralIntegrityAgent) Run(ctx context.Context) (Result, error) {
	return runChecks(ctx,
		a.checkCurrentAcademicYear,
		a.checkGenderSchoolType,
		a.checkEmptyGrades,
		a.checkEmptyStreams,
		a.checkUnclassedStudents,
	)
}

// checkCurrentAcademicYear flags when the count of academic years marked current isn't exactly 1.
func (a *StructuralIntegrityAgent) checkCurrentAcademicYear(ctx context.Context) checkOutcome {
	years, err := a.checks.ListCurrentAcademicYears(ctx)
	if err != nil {
		return checkOutcome{err: fmt.Errorf("current-academic-year check: %w", err)}
	}
	if len(years) == 1 {
		return checkOutcome{}
	}

	labels := make([]string, len(years))
	for i, y := range years {
		labels[i] = y.Label
	}
	var summary string
	if len(years) == 0 {
		summary = "no academic year is marked current"
	} else {
		summary = fmt.Sprintf("%d academic years marked current (expected exactly 1): %s", len(years), strings.Join(labels, ", "))
	}

	// Always critical: nearly every academic query trusts exactly one current year (docs/adr/0003).
	if err := notifyAdmins(ctx, a.checks, a.notifSvc, "Current-academic-year invariant violated",
		summary, "general", SeverityCritical); err != nil {
		return checkOutcome{findings: 1, label: "current-academic-year invariant violated", err: fmt.Errorf("found an issue but failed to notify admins: %w", err)}
	}
	return checkOutcome{findings: 1, label: "current-academic-year invariant violated"}
}

// checkGenderSchoolType flags active students whose gender doesn't match a single-sex school's type.
func (a *StructuralIntegrityAgent) checkGenderSchoolType(ctx context.Context) checkOutcome {
	students, err := a.checks.ListGenderSchoolTypeMismatches(ctx)
	if err != nil {
		return checkOutcome{err: fmt.Errorf("gender/school-type check: %w", err)}
	}
	if len(students) == 0 {
		return checkOutcome{}
	}

	names := make([]string, len(students))
	for i, s := range students {
		names[i] = fmt.Sprintf("%s (%s)", s.FullName, s.IndexNumber)
	}
	summary := fmt.Sprintf("%d student(s) with gender inconsistent with the school's single-sex type: %s", len(students), strings.Join(names, ", "))

	if err := notifyAdmins(ctx, a.checks, a.notifSvc, "Student gender / school-type mismatches",
		summary, "general", SeverityElevated); err != nil {
		return checkOutcome{findings: len(students), label: fmt.Sprintf("%d gender/school-type mismatch(es)", len(students)), err: fmt.Errorf("found %d issue(s) but failed to notify admins: %w", len(students), err)}
	}
	return checkOutcome{findings: len(students), label: fmt.Sprintf("%d gender/school-type mismatch(es)", len(students))}
}

// checkEmptyGrades flags grades with zero classes in the current academic year.
func (a *StructuralIntegrityAgent) checkEmptyGrades(ctx context.Context) checkOutcome {
	grades, err := a.checks.ListGradesWithNoCurrentClasses(ctx)
	if err != nil {
		return checkOutcome{err: fmt.Errorf("empty-grade check: %w", err)}
	}
	if len(grades) == 0 {
		return checkOutcome{}
	}

	names := make([]string, len(grades))
	for i, g := range grades {
		names[i] = g.Name
	}
	summary := fmt.Sprintf("%d grade(s) with no classes this year: %s", len(grades), strings.Join(names, ", "))

	if err := notifyAdmins(ctx, a.checks, a.notifSvc, "Grades with no current-year classes",
		summary, "general", SeverityLow); err != nil {
		return checkOutcome{findings: len(grades), label: fmt.Sprintf("%d empty grade(s)", len(grades)), err: fmt.Errorf("found %d grade(s) but failed to notify admins: %w", len(grades), err)}
	}
	return checkOutcome{findings: len(grades), label: fmt.Sprintf("%d empty grade(s)", len(grades))}
}

// checkEmptyStreams flags A/L streams with zero classes in the current academic year.
func (a *StructuralIntegrityAgent) checkEmptyStreams(ctx context.Context) checkOutcome {
	streams, err := a.checks.ListStreamsWithNoCurrentClasses(ctx)
	if err != nil {
		return checkOutcome{err: fmt.Errorf("empty-stream check: %w", err)}
	}
	if len(streams) == 0 {
		return checkOutcome{}
	}

	names := make([]string, len(streams))
	for i, s := range streams {
		names[i] = s.Name
	}
	summary := fmt.Sprintf("%d stream(s) with no classes this year: %s", len(streams), strings.Join(names, ", "))

	if err := notifyAdmins(ctx, a.checks, a.notifSvc, "Streams with no current-year classes",
		summary, "general", SeverityLow); err != nil {
		return checkOutcome{findings: len(streams), label: fmt.Sprintf("%d empty stream(s)", len(streams)), err: fmt.Errorf("found %d stream(s) but failed to notify admins: %w", len(streams), err)}
	}
	return checkOutcome{findings: len(streams), label: fmt.Sprintf("%d empty stream(s)", len(streams))}
}

// checkUnclassedStudents flags active students with no class in the current academic year, escalating severity as the count grows.
func (a *StructuralIntegrityAgent) checkUnclassedStudents(ctx context.Context) checkOutcome {
	students, err := a.checks.ListActiveStudentsWithoutCurrentClass(ctx)
	if err != nil {
		return checkOutcome{err: fmt.Errorf("unclassed-student check: %w", err)}
	}
	if len(students) == 0 {
		return checkOutcome{}
	}

	names := make([]string, len(students))
	for i, s := range students {
		names[i] = fmt.Sprintf("%s (%s)", s.FullName, s.IndexNumber)
	}
	summary := fmt.Sprintf("%d active student(s) with no class in the current academic year: %s", len(students), strings.Join(names, ", "))

	severity := SeverityLow
	if len(students) >= unclassedElevatedThreshold {
		severity = SeverityElevated
	}

	if err := notifyAdmins(ctx, a.checks, a.notifSvc, "Students with no current-year class",
		summary, "general", severity); err != nil {
		return checkOutcome{findings: len(students), label: fmt.Sprintf("%d unclassed student(s)", len(students)), err: fmt.Errorf("found %d student(s) but failed to notify admins: %w", len(students), err)}
	}
	return checkOutcome{findings: len(students), label: fmt.Sprintf("%d unclassed student(s)", len(students))}
}

// Title is the agent's name on the Automation panel.
func (a *StructuralIntegrityAgent) Title() string { return "Structural integrity" }

// CanDisable reports whether an admin may switch this agent off.
func (a *StructuralIntegrityAgent) CanDisable() bool { return true }

// Checks lists what this agent checks and where each finding is shown.
func (a *StructuralIntegrityAgent) Checks() []CheckInfo {
	return []CheckInfo{
		{Key: "current_year", Title: "One current academic year", Description: "Exactly one academic year must be current (ADR 0003).", FindingTitle: "Current-academic-year invariant violated", Pages: []string{"/academic-years"}},
		{Key: "gender_school_type", Title: "Student gender matches school type", Description: "In a boys or girls school every student matches the school type.", FindingTitle: "Student gender / school-type mismatches", Pages: []string{"/students"}},
		{Key: "empty_grades", Title: "Grades have classes", Description: "Every grade has at least one class this year.", FindingTitle: "Grades with no current-year classes", Pages: []string{"/classes"}},
		{Key: "empty_streams", Title: "Streams have classes", Description: "Every stream has at least one class this year.", FindingTitle: "Streams with no current-year classes", Pages: []string{"/streams"}},
		{Key: "unclassed_students", Title: "Students have a class", Description: "Every active student is in a class this year.", FindingTitle: "Students with no current-year class", Pages: []string{"/students", "/classes"}},
	}
}
