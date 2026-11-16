package people

import (
	"context"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/idp"
)

// rollbackTimeout bounds one undo; it runs on its own deadline because the
// request's may already be spent by the time a step fails.
const rollbackTimeout = 10 * time.Second

// rollbackAccount undoes a half-made account: the identity provider login and,
// when deleteLocal is set, the local user row. A step that fails is logged and
// queued in pending_identity_erasures for the hourly retry job, so a working
// login with no profile is never left behind silently (E1).
func rollbackAccount(ctx context.Context, provider idp.Provider, pending PendingEraser, idpUserID string, userID uuid.UUID, deleteLocal func(context.Context, uuid.UUID) error) {
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), rollbackTimeout)
	defer cancel()

	localDone := true
	var lastErr error
	if deleteLocal != nil {
		if err := deleteLocal(ctx, userID); err != nil {
			localDone, lastErr = false, err
			slog.Error("account rollback: local user not removed", "user_id", userID, "error", err)
		}
	}
	idpDone := true
	if err := provider.DeleteUser(ctx, idpUserID); err != nil {
		idpDone, lastErr = false, err
		slog.Error("account rollback: identity provider login not removed", "user_id", userID, "error", err)
	}
	if localDone && idpDone {
		return
	}
	if pending == nil {
		slog.Error("account rollback: no retry queue configured, clean up by hand", "user_id", userID)
		return
	}
	if err := pending.RecordPendingErasure(ctx, userID, localDone, idpDone, lastErr.Error()); err != nil {
		slog.Error("account rollback: could not queue retry", "user_id", userID, "error", err)
	}
}
