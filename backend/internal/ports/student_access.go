package ports

import (
	"context"

	"github.com/google/uuid"
)

// StudentAccessAuthorizer exposes the identity-to-student relationships needed
// by student-resource authorization middleware without exposing persistence.
type StudentAccessAuthorizer interface {
	StudentIDForUser(context.Context, uuid.UUID) (uuid.UUID, error)
	IsGuardianOfStudent(context.Context, uuid.UUID, uuid.UUID) (bool, error)
}

// ClassAccess decides whether a teacher may work with a class or a student: they teach it or lead its grade.
type ClassAccess interface {
	CanAccessClass(ctx context.Context, userID, classID uuid.UUID) (bool, error)
	CanAccessStudent(ctx context.Context, userID, studentID uuid.UUID) (bool, error)
}
