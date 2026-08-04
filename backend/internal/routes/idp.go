package routes

import (
	"github.com/openschool-org/openschool/internal/identity"
	"github.com/openschool-org/openschool/internal/thunderid"
)

func newIdentityProvider() identity.Provider {
	return thunderid.NewClient()
}
