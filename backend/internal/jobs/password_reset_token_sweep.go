package jobs

import (
	"context"
	"fmt"

	"github.com/openschool-org/openschool/internal/repositories"
)

const PasswordResetTokenSweepJobName = "password_reset_token_sweep"

// PasswordResetTokenSweepJob is the last third of the original §
// Proposed — maintenance/ops agents item 8 (docs/plan.md), split out as
// its own job since it's a pure cleanup action with nothing to notify
// about and no natural page to attach a finding to — unlike the two
// onboarding watchers, it has no per-account "finding" to name, just a
// row count swept.
type PasswordResetTokenSweepJob struct {
	checks *repositories.JobChecksRepository
}

func NewPasswordResetTokenSweepJob(checks *repositories.JobChecksRepository) *PasswordResetTokenSweepJob {
	return &PasswordResetTokenSweepJob{checks: checks}
}

func (j *PasswordResetTokenSweepJob) Name() string     { return PasswordResetTokenSweepJobName }
func (j *PasswordResetTokenSweepJob) Schedule() string { return "0 8 * * 1" } // weekly, Monday 08:00
func (j *PasswordResetTokenSweepJob) Description() string {
	return "Deletes expired, unused password-reset tokens."
}

func (j *PasswordResetTokenSweepJob) Run(ctx context.Context) (Result, error) {
	deleted, err := j.checks.DeleteExpiredPasswordResetTokens(ctx)
	if err != nil {
		return Result{}, fmt.Errorf("expired reset token sweep: %w", err)
	}
	return Result{Summary: fmt.Sprintf("swept %d expired reset token(s)", deleted), Findings: 0}, nil
}
