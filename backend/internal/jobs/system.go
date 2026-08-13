package jobs

import (
	"context"
	"errors"

	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services/notifications"
)

var errNoAdminAccount = errors.New("no admin account exists to notify or attribute this job's actions to")

// notifyAdmins sends a system-triggered notification to every admin
// account, reusing NotificationService.SendDirect — the same "system
// composes and fires, bypassing normal authorization" path the timetable
// workflow already uses. notifications.created_by is a NOT NULL FK to
// users, so system-triggered notifications are attributed to the
// earliest-created admin account rather than a synthetic user.
func notifyAdmins(ctx context.Context, checks *repositories.JobChecksRepository, notifSvc *notifications.NotificationService, title, message, category string) error {
	adminIDs, err := checks.ListAdminUserIDs(ctx)
	if err != nil {
		return err
	}
	if len(adminIDs) == 0 {
		return errNoAdminAccount
	}
	return notifSvc.SendDirect(ctx, title, message, category, "normal", adminIDs[0], adminIDs)
}
