package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

// JobChecksRepository wraps the ad-hoc, one-off queries in
// db/queries/job_checks.sql — each backs exactly one background job
// (internal/jobs), not a full entity's CRUD, so they're grouped here rather
// than split across the repositories each query's subject already has.
type JobChecksRepository struct {
	queries *db.Queries
}

func NewJobChecksRepository(pool *pgxpool.Pool) *JobChecksRepository {
	return &JobChecksRepository{queries: db.New(pool)}
}

func (r *JobChecksRepository) ListAdminUserIDs(ctx context.Context) ([]uuid.UUID, error) {
	return r.queries.ListAdminUserIDs(ctx)
}

func (r *JobChecksRepository) ListCurrentAcademicYears(ctx context.Context) ([]db.AcademicYear, error) {
	return r.queries.ListCurrentAcademicYears(ctx)
}

func (r *JobChecksRepository) ListGenderSchoolTypeMismatches(ctx context.Context) ([]db.ListGenderSchoolTypeMismatchesRow, error) {
	return r.queries.ListGenderSchoolTypeMismatches(ctx)
}

func (r *JobChecksRepository) ListActiveStudentsWithoutCurrentClass(ctx context.Context) ([]db.ListActiveStudentsWithoutCurrentClassRow, error) {
	return r.queries.ListActiveStudentsWithoutCurrentClass(ctx)
}

func (r *JobChecksRepository) ListGradesWithNoCurrentClasses(ctx context.Context) ([]db.ListGradesWithNoCurrentClassesRow, error) {
	return r.queries.ListGradesWithNoCurrentClasses(ctx)
}

func (r *JobChecksRepository) ListStreamsWithNoCurrentClasses(ctx context.Context) ([]db.ListStreamsWithNoCurrentClassesRow, error) {
	return r.queries.ListStreamsWithNoCurrentClasses(ctx)
}

func (r *JobChecksRepository) ListActiveStudentsWithoutGuardian(ctx context.Context) ([]db.ListActiveStudentsWithoutGuardianRow, error) {
	return r.queries.ListActiveStudentsWithoutGuardian(ctx)
}

func (r *JobChecksRepository) ListInactiveTeachersStillAssigned(ctx context.Context) ([]db.ListInactiveTeachersStillAssignedRow, error) {
	return r.queries.ListInactiveTeachersStillAssigned(ctx)
}

func (r *JobChecksRepository) ListCurrentYearClassesMissingTodaySession(ctx context.Context) ([]db.ListCurrentYearClassesMissingTodaySessionRow, error) {
	return r.queries.ListCurrentYearClassesMissingTodaySession(ctx)
}

func (r *JobChecksRepository) ListTermsNearDeadlineWithNoMarks(ctx context.Context, withinDays int32) ([]db.ListTermsNearDeadlineWithNoMarksRow, error) {
	return r.queries.ListTermsNearDeadlineWithNoMarks(ctx, withinDays)
}

func (r *JobChecksRepository) ListStaleIncompleteSessions(ctx context.Context, olderThanHours int32) ([]db.ListStaleIncompleteSessionsRow, error) {
	return r.queries.ListStaleIncompleteSessions(ctx, olderThanHours)
}

func (r *JobChecksRepository) ListStaleMustChangePasswordUsersByRole(ctx context.Context, role string, olderThanDays int32) ([]db.ListStaleMustChangePasswordUsersByRoleRow, error) {
	return r.queries.ListStaleMustChangePasswordUsersByRole(ctx, db.ListStaleMustChangePasswordUsersByRoleParams{
		Role:          role,
		OlderThanDays: olderThanDays,
	})
}

func (r *JobChecksRepository) DeleteExpiredPasswordResetTokens(ctx context.Context) (int64, error) {
	return r.queries.DeleteExpiredPasswordResetTokens(ctx)
}

func (r *JobChecksRepository) ListBurstAuditActors(ctx context.Context, threshold int32) ([]db.ListBurstAuditActorsRow, error) {
	return r.queries.ListBurstAuditActors(ctx, threshold)
}
