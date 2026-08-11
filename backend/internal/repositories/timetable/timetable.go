package timetable

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

func pgUUID(id uuid.UUID) pgtype.UUID {
	return pgtype.UUID{Bytes: id, Valid: true}
}

func pgText(s string) pgtype.Text {
	if s == "" {
		return pgtype.Text{}
	}
	return pgtype.Text{String: s, Valid: true}
}

type TimetableRepository struct {
	queries *db.Queries
}

func NewTimetableRepository(pool *pgxpool.Pool) *TimetableRepository {
	return &TimetableRepository{queries: db.New(pool)}
}

func (r *TimetableRepository) Create(ctx context.Context, params db.CreateTimetableParams) (db.Timetable, error) {
	return r.queries.CreateTimetable(ctx, params)
}

func (r *TimetableRepository) GetByID(ctx context.Context, id uuid.UUID) (db.Timetable, error) {
	return r.queries.GetTimetableByID(ctx, id)
}

func (r *TimetableRepository) GetMaxVersionForClass(ctx context.Context, classID, academicYearID uuid.UUID) (int32, error) {
	return r.queries.GetMaxVersionForClass(ctx, db.GetMaxVersionForClassParams{ClassID: classID, AcademicYearID: academicYearID})
}

func (r *TimetableRepository) ListByClass(ctx context.Context, classID, academicYearID uuid.UUID) ([]db.ListTimetablesByClassRow, error) {
	return r.queries.ListTimetablesByClass(ctx, db.ListTimetablesByClassParams{ClassID: classID, AcademicYearID: academicYearID})
}

func (r *TimetableRepository) ListByAcademicYear(ctx context.Context, academicYearID uuid.UUID) ([]db.ListTimetablesByAcademicYearRow, error) {
	return r.queries.ListTimetablesByAcademicYear(ctx, academicYearID)
}

func (r *TimetableRepository) GetPublishedForClass(ctx context.Context, classID, academicYearID uuid.UUID) (db.Timetable, error) {
	return r.queries.GetPublishedTimetableForClass(ctx, db.GetPublishedTimetableForClassParams{ClassID: classID, AcademicYearID: academicYearID})
}

func (r *TimetableRepository) ListUnderReviewForGrades(ctx context.Context, academicYearID uuid.UUID, gradeIDs []uuid.UUID) ([]db.ListUnderReviewTimetablesForGradesRow, error) {
	return r.queries.ListUnderReviewTimetablesForGrades(ctx, db.ListUnderReviewTimetablesForGradesParams{
		AcademicYearID: academicYearID,
		Column2:        gradeIDs,
	})
}

func (r *TimetableRepository) Submit(ctx context.Context, id, submittedBy uuid.UUID) (db.Timetable, error) {
	return r.queries.SubmitTimetableForReview(ctx, db.SubmitTimetableForReviewParams{ID: id, SubmittedBy: pgUUID(submittedBy)})
}

func (r *TimetableRepository) Approve(ctx context.Context, id, reviewedBy uuid.UUID, comment string) (db.Timetable, error) {
	return r.queries.ApproveTimetable(ctx, db.ApproveTimetableParams{ID: id, ReviewedBy: pgUUID(reviewedBy), ReviewComments: pgText(comment)})
}

func (r *TimetableRepository) Reject(ctx context.Context, id, reviewedBy uuid.UUID, comment string) (db.Timetable, error) {
	return r.queries.RejectTimetable(ctx, db.RejectTimetableParams{ID: id, ReviewedBy: pgUUID(reviewedBy), ReviewComments: pgText(comment)})
}

func (r *TimetableRepository) Publish(ctx context.Context, id, publishedBy uuid.UUID) (db.Timetable, error) {
	return r.queries.PublishTimetable(ctx, db.PublishTimetableParams{ID: id, PublishedBy: pgUUID(publishedBy)})
}

func (r *TimetableRepository) ArchivePublishedForClass(ctx context.Context, classID, academicYearID uuid.UUID) error {
	return r.queries.ArchivePublishedForClass(ctx, db.ArchivePublishedForClassParams{ClassID: classID, AcademicYearID: academicYearID})
}

func (r *TimetableRepository) Archive(ctx context.Context, id uuid.UUID) (db.Timetable, error) {
	return r.queries.ArchiveTimetable(ctx, id)
}

func (r *TimetableRepository) DeleteDraft(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteDraftTimetable(ctx, id)
}

// Entries

func (r *TimetableRepository) UpsertEntry(ctx context.Context, params db.UpsertTimetableEntryParams) (db.TimetableEntry, error) {
	return r.queries.UpsertTimetableEntry(ctx, params)
}

func (r *TimetableRepository) DeleteEntry(ctx context.Context, timetableID uuid.UUID, dayOfWeek, periodNumber int16) error {
	return r.queries.DeleteTimetableEntry(ctx, db.DeleteTimetableEntryParams{TimetableID: timetableID, DayOfWeek: dayOfWeek, PeriodNumber: periodNumber})
}

func (r *TimetableRepository) ListEntries(ctx context.Context, timetableID uuid.UUID) ([]db.ListTimetableEntriesByTimetableRow, error) {
	return r.queries.ListTimetableEntriesByTimetable(ctx, timetableID)
}

func (r *TimetableRepository) CopyEntries(ctx context.Context, sourceID, targetID uuid.UUID) error {
	return r.queries.CopyTimetableEntries(ctx, db.CopyTimetableEntriesParams{TimetableID: sourceID, TimetableID_2: targetID})
}

func (r *TimetableRepository) ListEntriesForYearExcluding(ctx context.Context, academicYearID, timetableID uuid.UUID) ([]db.ListEntriesForYearExcludingTimetableRow, error) {
	return r.queries.ListEntriesForYearExcludingTimetable(ctx, db.ListEntriesForYearExcludingTimetableParams{AcademicYearID: academicYearID, ID: timetableID})
}

func (r *TimetableRepository) CountEntriesBySubject(ctx context.Context, timetableID uuid.UUID) ([]db.CountEntriesBySubjectForTimetableRow, error) {
	return r.queries.CountEntriesBySubjectForTimetable(ctx, timetableID)
}

func (r *TimetableRepository) IsTeacherAssignedToSubject(ctx context.Context, teacherID, subjectID uuid.UUID) (bool, error) {
	return r.queries.IsTeacherAssignedToSubject(ctx, db.IsTeacherAssignedToSubjectParams{TeacherID: teacherID, SubjectID: subjectID})
}

func (r *TimetableRepository) ListTeacherScheduleForYear(ctx context.Context, teacherID, academicYearID uuid.UUID) ([]db.ListTeacherScheduleForYearRow, error) {
	return r.queries.ListTeacherScheduleForYear(ctx, db.ListTeacherScheduleForYearParams{TeacherID: pgUUID(teacherID), AcademicYearID: academicYearID})
}

// Status history

func (r *TimetableRepository) AddStatusHistory(ctx context.Context, timetableID uuid.UUID, fromStatus *string, toStatus string, changedBy uuid.UUID, comment string) (db.TimetableStatusHistory, error) {
	params := db.CreateTimetableStatusHistoryParams{
		TimetableID: timetableID,
		ToStatus:    toStatus,
		ChangedBy:   changedBy,
		Comment:     pgText(comment),
	}
	if fromStatus != nil {
		params.FromStatus = pgText(*fromStatus)
	}
	return r.queries.CreateTimetableStatusHistory(ctx, params)
}

func (r *TimetableRepository) ListStatusHistory(ctx context.Context, timetableID uuid.UUID) ([]db.ListTimetableStatusHistoryRow, error) {
	return r.queries.ListTimetableStatusHistory(ctx, timetableID)
}
