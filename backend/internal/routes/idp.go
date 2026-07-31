package routes

import (
	"github.com/openschool-org/openschool/internal/asgardeo"
	"github.com/openschool-org/openschool/internal/identity"
	"github.com/openschool-org/openschool/internal/thunderid"
)

func newIdentityProvider() identity.Provider {
	if identity.Selected() == "thunderid" {
		return thunderid.NewClient()
	}
	return asgardeo.NewClient()
}
