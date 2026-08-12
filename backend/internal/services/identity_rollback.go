package services

import (
	"context"
	"log"

	"github.com/openschool-org/openschool/internal/identity"
)

// rollbackIDPUser deletes an identity provider account created earlier in a signup flow after a later step failed; any deletion error is logged, not returned, so it doesn't hide the original failure that should reach the caller.
func rollbackIDPUser(ctx context.Context, idp identity.Provider, op, idpUserID string) {
	if err := idp.DeleteUser(ctx, idpUserID); err != nil {
		log.Printf("%s: failed to roll back identity provider user %s: %v (identity provider account now orphaned)", op, idpUserID, err)
	}
}
