package automation

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"

	"github.com/openschool-org/openschool/internal/modules/notifications"
)

// errNoAdminAccount signals notifyAdmins found no admin account to notify or attribute the notification to.
var errNoAdminAccount = errors.New("no admin account exists to notify or attribute this job's actions to")

// Severity is the shared three-tier vocabulary every agent's checks map to a notification's priority.
type Severity string

const (
	SeverityLow      Severity = "normal"    // worth knowing, not time-critical
	SeverityElevated Severity = "important" // should be looked at this week
	SeverityCritical Severity = "urgent"    // blocks a workflow or indicates likely misuse
)

// notifyAdmins sends a system-triggered notification to every admin account via NotificationService.SendDirect.
func notifyAdmins(ctx context.Context, checks *Repository, notifSvc *notifications.NotificationService, title, message, category string, severity Severity) error {
	adminIDs, err := checks.ListAdminUserIDs(ctx)
	if err != nil {
		return err
	}
	if len(adminIDs) == 0 {
		return errNoAdminAccount
	}
	return notifSvc.SendDirect(ctx, title, message, category, string(severity), adminIDs[0], adminIDs)
}

// checkOutcome is what one sub-check reports back to runChecks: a findings count, a summary label, and any error.
type checkOutcome struct {
	findings int
	label    string
	err      error
}

// finding describes what a sub-check found and how to tell admins about it.
type finding struct {
	count    int
	noun     string
	label    string
	title    string
	summary  string
	category string
	severity Severity
}

// reportFinding notifies admins and returns the outcome; the count is kept even if the notification fails.
func reportFinding(ctx context.Context, checks *Repository, notifSvc *notifications.NotificationService, f finding) checkOutcome {
	out := checkOutcome{findings: f.count, label: f.label}
	if err := notifyAdmins(ctx, checks, notifSvc, f.title, f.summary, f.category, f.severity); err != nil {
		out.err = fmt.Errorf("found %d %s but failed to notify admins: %w", f.count, f.noun, err)
	}
	return out
}

// runChecks runs every sub-check of a multi-check agent concurrently and aggregates their outcomes into one Result, without short-circuiting on the first error.
func runChecks(ctx context.Context, checks ...func(ctx context.Context) checkOutcome) (Result, error) {
	outcomes := make([]checkOutcome, len(checks))
	var wg sync.WaitGroup
	for i, c := range checks {
		wg.Add(1)
		go func(i int, c func(ctx context.Context) checkOutcome) {
			defer wg.Done()
			outcomes[i] = c(ctx)
		}(i, c)
	}
	wg.Wait()

	var errs []error
	var parts []string
	total := 0
	for _, o := range outcomes {
		if o.err != nil {
			errs = append(errs, o.err)
			continue
		}
		total += o.findings
		if o.label != "" {
			parts = append(parts, o.label)
		}
	}

	summary := "no issues found"
	if len(parts) > 0 {
		summary = strings.Join(parts, "; ")
	}
	if len(errs) > 0 {
		return Result{Summary: summary, Findings: total}, errors.Join(errs...)
	}
	return Result{Summary: summary, Findings: total}, nil
}
