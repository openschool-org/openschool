package ports

import (
	"context"
	"github.com/google/uuid"
)

// GuardianAccess exposes only the ownership queries needed by parent self-service.
type GuardianAccess interface {
	ChildrenForUser(context.Context, uuid.UUID) (any, error)
	ChildrenSummaryForUser(context.Context, uuid.UUID) (any, error)
	IsGuardianOfStudent(context.Context, uuid.UUID, uuid.UUID) (bool, error)
}

type GuardianAuthenticator interface {
	VerifyCredentials(context.Context, uuid.UUID, string) error
}
