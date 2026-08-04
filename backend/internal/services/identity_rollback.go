package services

import (
	"context"
	"log"

	"github.com/openschool-org/openschool/internal/identity"
)

// rollbackIDPUser deletes an identity provider account created earlier in a
// signup flow, after a later step in that same flow failed. Any deletion
// error is logged rather than returned: the original failure is always what
// gets surfaced to the caller, and losing it to report a rollback problem
// instead would hide the real cause.
func rollbackIDPUser(ctx context.Context, idp identity.Provider, op, idpUserID string) {
	if err := idp.DeleteUser(ctx, idpUserID); err != nil {
		log.Printf("%s: failed to roll back identity provider user %s: %v (identity provider account now orphaned)", op, idpUserID, err)
	}
}
