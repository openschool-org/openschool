package automation

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/modules/notifications"
)

// SecurityAuditAgentName is this agent's stable job_settings/job_runs identifier.
const SecurityAuditAgentName = "security_audit_agent"

// auditBaselineDays is the trailing window used to learn each actor's normal hourly change volume.
const auditBaselineDays = 14

// auditMinHoursObserved is the minimum active hours an actor needs in the baseline before their mean/stddev is trusted.
const auditMinHoursObserved = 5

// auditZScoreThreshold is how many standard deviations above an actor's own baseline counts as anomalous.
const auditZScoreThreshold = 3.0

// auditMinStdDevFloor prevents a division blow-up for an actor whose baseline happens to be perfectly regular.
const auditMinStdDevFloor = 1.0

// auditFallbackFixedThreshold is the floor used for actors without enough baseline history to trust a z-score.
const auditFallbackFixedThreshold = 50

// offHoursMinChanges is the minimum overnight change count worth flagging.
const offHoursMinChanges = 3

// sriLankaOffset is Sri Lanka's fixed UTC+5:30 (no DST), used to render off-hours timestamps in local wall time.
var sriLankaOffset = time.FixedZone("+05:30", 5*3600+30*60)

// SecurityAuditAgent runs three concurrent security checks: a per-actor statistical audit-log burst detector, off-hours activity detection, and the expired password-reset-token sweep.
type SecurityAuditAgent struct {
	checks   *Repository
	notifSvc *notifications.NotificationService
}

// NewSecurityAuditAgent constructs a SecurityAuditAgent with its dependencies.
func NewSecurityAuditAgent(checks *Repository, notifSvc *notifications.NotificationService) *SecurityAuditAgent {
	return &SecurityAuditAgent{checks: checks, notifSvc: notifSvc}
}

// Name returns this agent's job_settings/job_runs identifier.
func (a *SecurityAuditAgent) Name() string { return SecurityAuditAgentName }

// Schedule returns this agent's cron expression: hourly.
func (a *SecurityAuditAgent) Schedule() string { return "0 * * * *" }

// Description returns the one-line summary shown on the Automation panel.
func (a *SecurityAuditAgent) Description() string {
	return "Runs three security checks concurrently: per-actor statistical audit-log burst anomaly detection, off-hours activity detection, and the expired password-reset-token sweep."
}

// Run executes all three checks concurrently and aggregates their results.
func (a *SecurityAuditAgent) Run(ctx context.Context) (Result, error) {
	return runChecks(ctx,
		a.checkAuditAnomaly,
		a.checkOffHoursActivity,
		a.checkPasswordResetTokenSweep,
	)
}

// actorBaseline is one actor's learned hourly audit-log activity pattern.
type actorBaseline struct {
	fullName      string
	meanPerHour   float64
	stddevPerHour float64
	hoursObserved int64
}

// checkAuditAnomaly flags actors whose audit-log volume this hour is a statistical outlier against their own trailing baseline.
func (a *SecurityAuditAgent) checkAuditAnomaly(ctx context.Context) checkOutcome {
	baselineRows, err := a.checks.ListAuditActivityBaseline(ctx, auditBaselineDays)
	if err != nil {
		return checkOutcome{err: fmt.Errorf("audit-anomaly baseline: %w", err)}
	}
	currentRows, err := a.checks.ListCurrentHourAuditActivity(ctx)
	if err != nil {
		return checkOutcome{err: fmt.Errorf("audit-anomaly current-hour activity: %w", err)}
	}
	if len(currentRows) == 0 {
		return checkOutcome{}
	}

	baselines := make(map[uuid.UUID]actorBaseline, len(baselineRows))
	for _, b := range baselineRows {
		id := b.ActorID
		if id == uuid.Nil {
			continue
		}
		baselines[id] = actorBaseline{
			fullName:      b.FullName,
			meanPerHour:   b.MeanPerHour,
			stddevPerHour: b.StddevPerHour,
			hoursObserved: b.HoursObserved,
		}
	}

	var descriptions []string
	for _, cur := range currentRows {
		id := cur.ActorID
		if id == uuid.Nil {
			continue
		}
		count := float64(cur.ChangeCount)

		base, hasBaseline := baselines[id]
		var anomalous bool
		var reason string
		switch {
		case hasBaseline && base.hoursObserved >= auditMinHoursObserved:
			stddev := base.stddevPerHour
			if stddev < auditMinStdDevFloor {
				stddev = auditMinStdDevFloor
			}
			z := (count - base.meanPerHour) / stddev
			anomalous = z > auditZScoreThreshold
			reason = fmt.Sprintf("%d changes this hour (baseline %.1f ± %.1f, z=%.1f)", cur.ChangeCount, base.meanPerHour, base.stddevPerHour, z)
		default:
			anomalous = count > auditFallbackFixedThreshold
			reason = fmt.Sprintf("%d changes this hour (no established baseline; fixed threshold %d)", cur.ChangeCount, int(auditFallbackFixedThreshold))
		}

		if anomalous {
			descriptions = append(descriptions, fmt.Sprintf("%s: %s", cur.FullName, reason))
		}
	}
	if len(descriptions) == 0 {
		return checkOutcome{}
	}

	summary := fmt.Sprintf("%d account(s) with unusually high activity this hour: %s", len(descriptions), strings.Join(descriptions, "; "))

	if err := notifyAdmins(ctx, a.checks, a.notifSvc, "Unusual audit-log activity",
		summary, "emergency", SeverityCritical); err != nil {
		return checkOutcome{findings: len(descriptions), label: fmt.Sprintf("%d account(s) with anomalous activity", len(descriptions)), err: fmt.Errorf("found %d account(s) but failed to notify admins: %w", len(descriptions), err)}
	}
	return checkOutcome{findings: len(descriptions), label: fmt.Sprintf("%d account(s) with anomalous activity", len(descriptions))}
}

// checkOffHoursActivity flags actors with several audit-logged changes between midnight and 5am Sri Lanka time.
func (a *SecurityAuditAgent) checkOffHoursActivity(ctx context.Context) checkOutcome {
	actors, err := a.checks.ListOffHoursAuditActivity(ctx, offHoursMinChanges)
	if err != nil {
		return checkOutcome{err: fmt.Errorf("off-hours activity check: %w", err)}
	}
	if len(actors) == 0 {
		return checkOutcome{}
	}

	descriptions := make([]string, len(actors))
	for i, act := range actors {
		descriptions[i] = fmt.Sprintf("%s: %d change(s) between %s and %s (Sri Lanka time)",
			act.FullName, act.ChangeCount,
			act.FirstSeen.In(sriLankaOffset).Format("15:04"),
			act.LastSeen.In(sriLankaOffset).Format("15:04"))
	}
	summary := fmt.Sprintf("%d account(s) with overnight (00:00-05:00) activity: %s", len(actors), strings.Join(descriptions, "; "))

	if err := notifyAdmins(ctx, a.checks, a.notifSvc, "Unusual off-hours account activity",
		summary, "emergency", SeverityElevated); err != nil {
		return checkOutcome{findings: len(actors), label: fmt.Sprintf("%d account(s) active off-hours", len(actors)), err: fmt.Errorf("found %d account(s) but failed to notify admins: %w", len(actors), err)}
	}
	return checkOutcome{findings: len(actors), label: fmt.Sprintf("%d account(s) active off-hours", len(actors))}
}

// checkPasswordResetTokenSweep deletes expired, unused password-reset tokens; pure housekeeping, nothing to notify about.
func (a *SecurityAuditAgent) checkPasswordResetTokenSweep(ctx context.Context) checkOutcome {
	deleted, err := a.checks.DeleteExpiredPasswordResetTokens(ctx)
	if err != nil {
		return checkOutcome{err: fmt.Errorf("expired reset token sweep: %w", err)}
	}
	if deleted == 0 {
		return checkOutcome{}
	}
	return checkOutcome{label: fmt.Sprintf("swept %d expired reset token(s)", deleted)}
}

// Title is the agent's name on the Automation panel.
func (a *SecurityAuditAgent) Title() string { return "Security audit" }

// CanDisable reports whether an admin may switch this agent off.
func (a *SecurityAuditAgent) CanDisable() bool { return true }

// Checks lists what this agent checks and where each finding is shown.
func (a *SecurityAuditAgent) Checks() []CheckInfo {
	return []CheckInfo{
		{Key: "audit_anomaly", Title: "Unusual admin activity", Description: "Flags a spike in audit-log entries compared with the usual level.", FindingTitle: "Unusual audit-log activity", Pages: []string{"/settings"}},
		{Key: "off_hours", Title: "Off-hours activity", Description: "Flags account activity at unusual hours.", FindingTitle: "Unusual off-hours account activity", Pages: []string{"/settings"}},
		{Key: "reset_token_sweep", Title: "Expired reset links", Description: "Deletes expired password-reset links."},
	}
}
