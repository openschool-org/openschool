package timetable

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type timetableRepository struct{ queries *db.Queries }

func newTimetableRepository(pool *pgxpool.Pool) *timetableRepository {
	return &timetableRepository{queries: db.New(pool)}
}

func (r *timetableRepository) create(ctx context.Context, academicYearID, classID, createdBy uuid.UUID, parentID *uuid.UUID) (Timetable, error) {
	maxVersion, err := r.queries.GetMaxVersionForClass(ctx, db.GetMaxVersionForClassParams{ClassID: classID, AcademicYearID: academicYearID})
	if err != nil {
		return Timetable{}, err
	}
	params := db.CreateTimetableParams{
		AcademicYearID: academicYearID,
		ClassID:        classID,
		Version:        maxVersion + 1,
		CreatedBy:      createdBy,
	}
	if parentID != nil {
		params.ParentTimetableID = optionalClassroomUUID(parentID)
	}
	row, err := r.queries.CreateTimetable(ctx, params)
	return mapTimetable(row), err
}

func (r *timetableRepository) get(ctx context.Context, id uuid.UUID) (Timetable, error) {
	row, err := r.queries.GetTimetableByID(ctx, id)
	return mapTimetable(row), err
}

func (r *timetableRepository) copyEntries(ctx context.Context, sourceID, targetID uuid.UUID) error {
	return r.queries.CopyTimetableEntries(ctx, db.CopyTimetableEntriesParams{TimetableID: sourceID, TimetableID_2: targetID})
}

func (r *timetableRepository) listByClass(ctx context.Context, classID, academicYearID uuid.UUID) ([]TimetableListItem, error) {
	rows, err := r.queries.ListTimetablesByClass(ctx, db.ListTimetablesByClassParams{ClassID: classID, AcademicYearID: academicYearID})
	if err != nil {
		return nil, err
	}
	result := make([]TimetableListItem, len(rows))
	for i, row := range rows {
		result[i] = TimetableListItem{Timetable: mapTimetableListRow(row), ClassName: row.ClassName, GradeName: row.GradeName}
	}
	return result, nil
}

func (r *timetableRepository) listByAcademicYear(ctx context.Context, academicYearID uuid.UUID) ([]TimetableListItem, error) {
	rows, err := r.queries.ListTimetablesByAcademicYear(ctx, academicYearID)
	if err != nil {
		return nil, err
	}
	result := make([]TimetableListItem, len(rows))
	for i, row := range rows {
		result[i] = TimetableListItem{Timetable: mapTimetableAcademicYearRow(row), ClassName: row.ClassName, GradeName: row.GradeName}
	}
	return result, nil
}

func (r *timetableRepository) deleteDraft(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteDraftTimetable(ctx, id)
}

func (r *timetableRepository) archive(ctx context.Context, id uuid.UUID) (Timetable, error) {
	row, err := r.queries.ArchiveTimetable(ctx, id)
	return mapTimetable(row), err
}

func (r *timetableRepository) listStatusHistory(ctx context.Context, timetableID uuid.UUID) ([]StatusHistoryItem, error) {
	rows, err := r.queries.ListTimetableStatusHistory(ctx, timetableID)
	if err != nil {
		return nil, err
	}
	result := make([]StatusHistoryItem, len(rows))
	for i, row := range rows {
		result[i] = StatusHistoryItem{
			ID: row.ID, TimetableID: row.TimetableID, FromStatus: entryText(row.FromStatus), ToStatus: row.ToStatus,
			ChangedBy: row.ChangedBy, Comment: entryText(row.Comment), ChangedAt: row.ChangedAt.Time, ChangedByName: row.ChangedByName,
		}
	}
	return result, nil
}

func (r *timetableRepository) class(ctx context.Context, id uuid.UUID) (workflowClass, error) {
	row, err := r.queries.GetClassByID(ctx, id)
	if err != nil {
		return workflowClass{}, err
	}
	return workflowClass{ID: row.ID, GradeID: row.GradeID, Name: row.Name}, nil
}

func (r *timetableRepository) teacherByUser(ctx context.Context, userID uuid.UUID) (workflowTeacher, error) {
	row, err := r.queries.GetTeacherByUserID(ctx, userID)
	if err != nil {
		return workflowTeacher{}, err
	}
	return workflowTeacher{ID: row.ID, UserID: row.UserID}, nil
}

func (r *timetableRepository) teachersByIDs(ctx context.Context, ids []uuid.UUID) ([]workflowTeacher, error) {
	if len(ids) == 0 {
		return []workflowTeacher{}, nil
	}
	rows, err := r.queries.ListTeachersByIDs(ctx, ids)
	if err != nil {
		return nil, err
	}
	result := make([]workflowTeacher, len(rows))
	for i, row := range rows {
		result[i] = workflowTeacher{ID: row.ID, UserID: row.UserID}
	}
	return result, nil
}

func (r *timetableRepository) classLeaders(ctx context.Context, classID uuid.UUID) ([]uuid.UUID, error) {
	return r.queries.ListLeadersOfClass(ctx, classID)
}

func (r *timetableRepository) listReviewQueue(ctx context.Context, yearID, teacherID uuid.UUID) ([]reviewQueueItem, error) {
	rows, err := r.queries.ListUnderReviewTimetablesForLeader(ctx, db.ListUnderReviewTimetablesForLeaderParams{AcademicYearID: yearID, TeacherID: teacherID})
	if err != nil {
		return nil, err
	}
	result := make([]reviewQueueItem, len(rows))
	for i, row := range rows {
		result[i] = reviewQueueItem{Timetable: Timetable{
			ID: row.ID, AcademicYearID: row.AcademicYearID, ClassID: row.ClassID, Version: row.Version, Status: row.Status,
			ParentTimetableID: entryUUID(row.ParentTimetableID), CreatedBy: row.CreatedBy, SubmittedAt: entryTime(row.SubmittedAt),
			SubmittedBy: entryUUID(row.SubmittedBy), ReviewedBy: entryUUID(row.ReviewedBy), ReviewedAt: entryTime(row.ReviewedAt),
			ReviewComments: entryText(row.ReviewComments), PublishedAt: entryTime(row.PublishedAt), PublishedBy: entryUUID(row.PublishedBy),
			CreatedAt: row.CreatedAt.Time, UpdatedAt: row.UpdatedAt.Time,
		}, ClassName: row.ClassName, GradeName: row.GradeName}
	}
	return result, nil
}

func (r *timetableRepository) submit(ctx context.Context, id, actor uuid.UUID) (Timetable, error) {
	row, err := r.queries.SubmitTimetableForReview(ctx, db.SubmitTimetableForReviewParams{ID: id, SubmittedBy: optionalClassroomUUID(&actor)})
	return mapTimetable(row), err
}

func (r *timetableRepository) approve(ctx context.Context, id, reviewer uuid.UUID, comment string) (Timetable, error) {
	row, err := r.queries.ApproveTimetable(ctx, db.ApproveTimetableParams{ID: id, ReviewedBy: optionalClassroomUUID(&reviewer), ReviewComments: optionalClassroomText(comment)})
	return mapTimetable(row), err
}

func (r *timetableRepository) reject(ctx context.Context, id, reviewer uuid.UUID, comment string) (Timetable, error) {
	row, err := r.queries.RejectTimetable(ctx, db.RejectTimetableParams{ID: id, ReviewedBy: optionalClassroomUUID(&reviewer), ReviewComments: optionalClassroomText(comment)})
	return mapTimetable(row), err
}

func (r *timetableRepository) archivePublished(ctx context.Context, classID, yearID uuid.UUID) error {
	return r.queries.ArchivePublishedForClass(ctx, db.ArchivePublishedForClassParams{ClassID: classID, AcademicYearID: yearID})
}

func (r *timetableRepository) publish(ctx context.Context, id, actor uuid.UUID) (Timetable, error) {
	row, err := r.queries.PublishTimetable(ctx, db.PublishTimetableParams{ID: id, PublishedBy: optionalClassroomUUID(&actor)})
	return mapTimetable(row), err
}

func (r *timetableRepository) addStatusHistory(ctx context.Context, id uuid.UUID, fromStatus, toStatus string, actor uuid.UUID, comment string) error {
	_, err := r.queries.CreateTimetableStatusHistory(ctx, db.CreateTimetableStatusHistoryParams{
		TimetableID: id, FromStatus: optionalClassroomText(fromStatus), ToStatus: toStatus,
		ChangedBy: actor, Comment: optionalClassroomText(comment),
	})
	return err
}

func (r *timetableRepository) entries(ctx context.Context, timetableID uuid.UUID) ([]TimetableEntry, error) {
	return (&timetableEntryRepository{queries: r.queries}).listEntries(ctx, timetableID)
}

func (r *timetableRepository) studentUsersAndIDs(ctx context.Context, classID uuid.UUID) ([]uuid.UUID, []uuid.UUID, error) {
	rows, err := r.queries.ListStudentsByClass(ctx, classID)
	if err != nil {
		return nil, nil, err
	}
	users := make([]uuid.UUID, 0, len(rows))
	ids := make([]uuid.UUID, 0, len(rows))
	for _, row := range rows {
		ids = append(ids, row.ID)
		if row.UserID.Valid {
			users = append(users, uuid.UUID(row.UserID.Bytes))
		}
	}
	return users, ids, nil
}

func (r *timetableRepository) guardianUsers(ctx context.Context, studentIDs []uuid.UUID) ([]uuid.UUID, error) {
	rows, err := r.queries.ListGuardianUserIDsByStudentIDs(ctx, studentIDs)
	if err != nil {
		return nil, err
	}
	result := make([]uuid.UUID, 0, len(rows))
	for _, row := range rows {
		if row.Valid {
			result = append(result, uuid.UUID(row.Bytes))
		}
	}
	return result, nil
}

func (r *timetableRepository) teacherSchedule(ctx context.Context, teacherID, yearID uuid.UUID) ([]TeacherScheduleItem, error) {
	rows, err := r.queries.ListTeacherScheduleForYear(ctx, db.ListTeacherScheduleForYearParams{TeacherID: pgtype.UUID{Bytes: teacherID, Valid: true}, AcademicYearID: yearID})
	if err != nil {
		return nil, err
	}
	result := make([]TeacherScheduleItem, len(rows))
	for i, row := range rows {
		result[i] = TeacherScheduleItem{
			DayOfWeek: row.DayOfWeek, PeriodNumber: row.PeriodNumber, SubjectID: entryUUID(row.SubjectID), SubjectName: entryText(row.SubjectName),
			ClassroomID: entryUUID(row.ClassroomID), ClassroomName: entryText(row.ClassroomName), ClassroomType: entryText(row.ClassroomType), ClassID: row.ClassID, ClassName: row.ClassName, GradeName: row.GradeName,
		}
	}
	return result, nil
}

func (r *timetableRepository) studentByUser(ctx context.Context, userID uuid.UUID) (uuid.UUID, error) {
	row, err := r.queries.GetStudentByUserID(ctx, pgtype.UUID{Bytes: userID, Valid: true})
	return row.ID, err
}

func (r *timetableRepository) studentCurrentClass(ctx context.Context, studentID uuid.UUID) (uuid.UUID, uuid.UUID, error) {
	row, err := r.queries.GetStudentCurrentClass(ctx, studentID)
	return row.ID, row.AcademicYearID, err
}

func (r *timetableRepository) publishedForClass(ctx context.Context, classID, yearID uuid.UUID) (Timetable, []TimetableEntry, error) {
	row, err := r.queries.GetPublishedTimetableForClass(ctx, db.GetPublishedTimetableForClassParams{ClassID: classID, AcademicYearID: yearID})
	if err != nil {
		return Timetable{}, nil, err
	}
	entries, err := r.entries(ctx, row.ID)
	if err != nil {
		return Timetable{}, nil, err
	}
	return mapTimetable(row), entries, nil
}

func mapTimetable(row db.Timetable) Timetable {
	return Timetable{
		ID: row.ID, AcademicYearID: row.AcademicYearID, ClassID: row.ClassID,
		Version: row.Version, Status: row.Status, ParentTimetableID: entryUUID(row.ParentTimetableID),
		CreatedBy: row.CreatedBy, SubmittedAt: entryTime(row.SubmittedAt), SubmittedBy: entryUUID(row.SubmittedBy),
		ReviewedBy: entryUUID(row.ReviewedBy), ReviewedAt: entryTime(row.ReviewedAt), ReviewComments: entryText(row.ReviewComments),
		PublishedAt: entryTime(row.PublishedAt), PublishedBy: entryUUID(row.PublishedBy),
		CreatedAt: row.CreatedAt.Time, UpdatedAt: row.UpdatedAt.Time,
	}
}

func entryTime(value pgtype.Timestamptz) *time.Time {
	if !value.Valid {
		return nil
	}
	result := value.Time
	return &result
}

func mapTimetableListRow(row db.ListTimetablesByClassRow) Timetable {
	return Timetable{
		ID: row.ID, AcademicYearID: row.AcademicYearID, ClassID: row.ClassID, Version: row.Version, Status: row.Status,
		ParentTimetableID: entryUUID(row.ParentTimetableID), CreatedBy: row.CreatedBy, SubmittedAt: entryTime(row.SubmittedAt),
		SubmittedBy: entryUUID(row.SubmittedBy), ReviewedBy: entryUUID(row.ReviewedBy), ReviewedAt: entryTime(row.ReviewedAt),
		ReviewComments: entryText(row.ReviewComments), PublishedAt: entryTime(row.PublishedAt), PublishedBy: entryUUID(row.PublishedBy),
		CreatedAt: row.CreatedAt.Time, UpdatedAt: row.UpdatedAt.Time,
	}
}

func mapTimetableAcademicYearRow(row db.ListTimetablesByAcademicYearRow) Timetable {
	return Timetable{
		ID: row.ID, AcademicYearID: row.AcademicYearID, ClassID: row.ClassID, Version: row.Version, Status: row.Status,
		ParentTimetableID: entryUUID(row.ParentTimetableID), CreatedBy: row.CreatedBy, SubmittedAt: entryTime(row.SubmittedAt),
		SubmittedBy: entryUUID(row.SubmittedBy), ReviewedBy: entryUUID(row.ReviewedBy), ReviewedAt: entryTime(row.ReviewedAt),
		ReviewComments: entryText(row.ReviewComments), PublishedAt: entryTime(row.PublishedAt), PublishedBy: entryUUID(row.PublishedBy),
		CreatedAt: row.CreatedAt.Time, UpdatedAt: row.UpdatedAt.Time,
	}
}

func (r *timetableRepository) periodsForClass(ctx context.Context, classID uuid.UUID) ([]TimetablePeriod, error) {
	rows, err := r.queries.ListTimetablePeriodsForClass(ctx, classID)
	out := make([]TimetablePeriod, len(rows))
	for i, row := range rows {
		out[i] = mapTimetablePeriod(row)
	}
	return out, err
}
