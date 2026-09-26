package automation

import (
	"context"
	"errors"
	"fmt"

	"github.com/openschool-org/openschool/internal/idp"
	"github.com/openschool-org/openschool/internal/modules/notifications"
)

// DataRetentionAgentName is this agent's stable job_settings/job_runs identifier.
const DataRetentionAgentName = "data_retention_agent"

// studentRetentionYears bounds how long a left student's personal data is
// kept before the nightly purge anonymises it (S11,
// docs/SECURITY_AND_PERFORMANCE_PLAYBOOK.md section 3): 7 years after
// leaving, matching common school-records retention practice.
const studentRetentionYears = 7

// DataRetentionAgent anonymises left students' personal data once it has
// sat past the retention window, keeping the profile row itself so
// historical marks/attendance stay attributable in aggregate.
type DataRetentionAgent struct {
	checks   *Repository
	notifSvc *notifications.NotificationService
	idp      idp.Provider
}

// NewDataRetentionAgent constructs a DataRetentionAgent with its dependencies.
func NewDataRetentionAgent(checks *Repository, notifSvc *notifications.NotificationService, provider idp.Provider) *DataRetentionAgent {
	return &DataRetentionAgent{checks: checks, notifSvc: notifSvc, idp: provider}
}

// Name returns this agent's job_settings/job_runs identifier.
func (a *DataRetentionAgent) Name() string { return DataRetentionAgentName }

// Schedule returns this agent's cron expression: daily 03:00.
func (a *DataRetentionAgent) Schedule() string { return "0 3 * * *" }

// Description returns the one-line summary shown on the Automation panel.
func (a *DataRetentionAgent) Description() string {
	return fmt.Sprintf("Anonymises left students' personal data %d years after they left, keeping the profile row so historical marks/attendance stay attributable.", studentRetentionYears)
}

// Run anonymises every student past the retention window and notifies admins of what it did.
func (a *DataRetentionAgent) Run(ctx context.Context) (Result, error) {
	candidates, err := a.checks.ListStudentsPastRetention(ctx, studentRetentionYears)
	if err != nil {
		return Result{}, fmt.Errorf("retention scan: %w", err)
	}
	if len(candidates) == 0 {
		return Result{Summary: "no records past the retention window"}, nil
	}

	var errs []error
	erased := 0
	for _, c := range candidates {
		if err := a.checks.AnonymizeStudentProfile(ctx, c.ID); err != nil {
			errs = append(errs, fmt.Errorf("anonymise %s: %w", c.ID, err))
			continue
		}
		if c.HasUser {
			// The profile is already anonymised — the PDPA-sensitive part is
			// done — so a failure here doesn't fail the whole candidate. It's
			// persisted for retry instead of only logged, since IdentityErasureRetryAgent
			// is the only thing that will ever pick this back up otherwise.
			localErr := a.checks.EraseStudentUser(ctx, c.UserID)
			var idpErr error
			if a.idp != nil {
				idpErr = a.idp.DeleteUser(ctx, c.UserID.String())
			}
			if localErr != nil || idpErr != nil {
				lastErr := ""
				if localErr != nil {
					lastErr = localErr.Error()
				} else if idpErr != nil {
					lastErr = idpErr.Error()
				}
				if err := a.checks.RecordPendingErasure(ctx, c.UserID, localErr == nil, idpErr == nil, lastErr); err != nil {
					errs = append(errs, fmt.Errorf("failed to record pending erasure for %s: %w", c.UserID, err))
				}
			}
		}
		erased++
	}

	// Aggregate counts only — the erased students' names must not survive in
	// a stored, un-redacted admin notification once their profiles are meant
	// to be anonymised (S11).
	summary := fmt.Sprintf("anonymised %d student(s) past the %d-year retention window", erased, studentRetentionYears)
	if err := notifyAdmins(ctx, a.checks, a.notifSvc, "Nightly retention purge ran", summary, "general", SeverityElevated); err != nil {
		errs = append(errs, fmt.Errorf("ran purge but failed to notify admins: %w", err))
	}

	result := Result{Summary: summary, Findings: erased}
	if len(errs) > 0 {
		return result, errors.Join(errs...)
	}
	return result, nil
}

// Title is the agent's name on the Automation panel.
func (a *DataRetentionAgent) Title() string { return "Data retention" }

// CanDisable reports whether an admin may switch this agent off.
func (a *DataRetentionAgent) CanDisable() bool { return true }

// Checks lists what this agent checks and where each finding is shown.
func (a *DataRetentionAgent) Checks() []CheckInfo {
	return []CheckInfo{
		{Key: "retention_purge", Title: "PDPA retention purge", Description: "Erases personal data of people who left longer ago than the retention period.", FindingTitle: "Nightly retention purge ran", Pages: []string{"/settings"}},
	}
}
