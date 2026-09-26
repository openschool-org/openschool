package automation

import (
	"context"
	"errors"
	"fmt"

	"github.com/openschool-org/openschool/internal/idp"
)

// IdentityErasureRetryAgentName is this agent's stable job_settings/job_runs identifier.
const IdentityErasureRetryAgentName = "identity_erasure_retry_agent"

// maxPendingErasuresPerRun bounds how many retries one run attempts, so a
// large backlog can't make a single scheduled run run unboundedly long.
const maxPendingErasuresPerRun = 200

// IdentityErasureRetryAgent retries the identity cleanup steps (local user
// scrub, identity-provider account deletion) that failed after a student's
// profile was already anonymised — by the manual "erase person" flow
// (people.StudentService.Erase) or by DataRetentionAgent's nightly purge.
// Both record a pending_identity_erasures row instead of only logging a
// failure, since a log line alone leaves no way to know PII must still be
// removed (S11).
type IdentityErasureRetryAgent struct {
	checks *Repository
	idp    idp.Provider
}

// NewIdentityErasureRetryAgent constructs an IdentityErasureRetryAgent with its dependencies.
func NewIdentityErasureRetryAgent(checks *Repository, provider idp.Provider) *IdentityErasureRetryAgent {
	return &IdentityErasureRetryAgent{checks: checks, idp: provider}
}

// Name returns this agent's job_settings/job_runs identifier.
func (a *IdentityErasureRetryAgent) Name() string { return IdentityErasureRetryAgentName }

// Schedule returns this agent's cron expression: hourly, so a transient
// identity-provider outage doesn't leave PII lingering for a full day.
func (a *IdentityErasureRetryAgent) Schedule() string { return "0 * * * *" }

// Description returns the one-line summary shown on the Automation panel.
func (a *IdentityErasureRetryAgent) Description() string {
	return "Retries identity cleanup (local user scrub, identity-provider account deletion) that failed after a student profile was already anonymised."
}

// Run retries every pending erasure still missing a step, up to maxPendingErasuresPerRun.
func (a *IdentityErasureRetryAgent) Run(ctx context.Context) (Result, error) {
	pending, err := a.checks.ListPendingErasures(ctx, maxPendingErasuresPerRun)
	if err != nil {
		return Result{}, fmt.Errorf("list pending erasures: %w", err)
	}
	if len(pending) == 0 {
		return Result{Summary: "no pending identity erasures"}, nil
	}

	var errs []error
	completed, stillPending := 0, 0
	for _, p := range pending {
		localDone, idpDone := p.LocalDone, p.IdpDone

		var lastErr error
		if !localDone {
			if err := a.checks.EraseStudentUser(ctx, p.UserID); err != nil {
				lastErr = err
			} else {
				localDone = true
			}
		}
		if !idpDone {
			if a.idp == nil {
				lastErr = errors.New("no identity provider configured")
			} else if err := a.idp.DeleteUser(ctx, p.UserID.String()); err != nil {
				lastErr = err
			} else {
				idpDone = true
			}
		}

		if localDone && idpDone {
			if err := a.checks.DeletePendingErasure(ctx, p.ID); err != nil {
				errs = append(errs, fmt.Errorf("erasure for %s completed but failed to clear retry record: %w", p.UserID, err))
			}
			completed++
			continue
		}

		stillPending++
		errMsg := ""
		if lastErr != nil {
			errMsg = lastErr.Error()
		}
		if err := a.checks.RecordPendingErasure(ctx, p.UserID, localDone, idpDone, errMsg); err != nil {
			errs = append(errs, fmt.Errorf("failed to update pending erasure for %s: %w", p.UserID, err))
		}
	}

	summary := fmt.Sprintf("completed %d pending identity erasure(s), %d still pending", completed, stillPending)
	result := Result{Summary: summary, Findings: stillPending}
	if len(errs) > 0 {
		return result, errors.Join(errs...)
	}
	return result, nil
}

// Title is the agent's name on the Automation panel.
func (a *IdentityErasureRetryAgent) Title() string { return "Identity erasure retry" }

// CanDisable reports whether an admin may switch this agent off.
func (a *IdentityErasureRetryAgent) CanDisable() bool { return true }

// Checks lists what this agent checks and where each finding is shown.
func (a *IdentityErasureRetryAgent) Checks() []CheckInfo {
	return []CheckInfo{
		{Key: "erasure_retry", Title: "Retry sign-in account deletion", Description: "Retries deleting ThunderID accounts that failed to delete earlier."},
	}
}
