package timetable

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type timetableEntryRepository struct{ queries *db.Queries }

func newTimetableEntryRepository(pool *pgxpool.Pool) *timetableEntryRepository {
	return &timetableEntryRepository{queries: db.New(pool)}
}

func (r *timetableEntryRepository) status(ctx context.Context, id uuid.UUID) (string, error) {
	row, err := r.queries.GetTimetableByID(ctx, id)
	return row.Status, err
}
func (r *timetableEntryRepository) listEntries(ctx context.Context, timetableID uuid.UUID) ([]TimetableEntry, error) {
	rows, err := r.queries.ListTimetableEntriesByTimetable(ctx, timetableID)
	if err != nil {
		return nil, err
	}
	result := make([]TimetableEntry, len(rows))
	for i, row := range rows {
		result[i] = TimetableEntry{
			ID: row.ID, TimetableID: row.TimetableID, DayOfWeek: row.DayOfWeek, PeriodNumber: row.PeriodNumber,
			SubjectID: entryUUID(row.SubjectID), TeacherID: entryUUID(row.TeacherID), ClassroomID: entryUUID(row.ClassroomID),
			CreatedAt: row.CreatedAt.Time, UpdatedAt: row.UpdatedAt.Time, SubjectName: entryText(row.SubjectName),
			TeacherName: entryText(pgtype.Text{String: row.TeacherName, Valid: row.TeacherName != ""}), ClassroomName: entryText(row.ClassroomName),
			ClassroomType: entryText(row.ClassroomType), OptionBlockID: entryUUID(row.OptionBlockID), OptionBlockName: entryText(row.OptionBlockName),
		}
	}
	return result, nil
}
func (r *timetableEntryRepository) upsertEntry(ctx context.Context, timetableID uuid.UUID, command timetableEntryCommand) error {
	_, err := r.queries.UpsertTimetableEntry(ctx, db.UpsertTimetableEntryParams{
		TimetableID: timetableID, DayOfWeek: command.DayOfWeek, PeriodNumber: command.PeriodNumber,
		SubjectID: optionalClassroomUUID(command.SubjectID), TeacherID: optionalClassroomUUID(command.TeacherID), ClassroomID: optionalClassroomUUID(command.ClassroomID),
	})
	return err
}
func (r *timetableEntryRepository) deleteEntry(ctx context.Context, timetableID uuid.UUID, day, period int16) error {
	return r.queries.DeleteTimetableEntry(ctx, db.DeleteTimetableEntryParams{TimetableID: timetableID, DayOfWeek: day, PeriodNumber: period})
}

func (r *timetableEntryRepository) validationContext(ctx context.Context, id uuid.UUID) (validationContext, error) {
	timetable, err := r.queries.GetTimetableByID(ctx, id)
	if err != nil {
		return validationContext{}, err
	}
	class, err := r.queries.GetClassByID(ctx, timetable.ClassID)
	if err != nil {
		return validationContext{}, err
	}
	return validationContext{AcademicYearID: timetable.AcademicYearID, ClassID: timetable.ClassID, GradeID: class.GradeID, FormTeacherID: entryUUID(class.FormTeacherID)}, nil
}
func (r *timetableEntryRepository) validationEntries(ctx context.Context, id uuid.UUID) ([]TimetableEntry, error) {
	return r.listEntries(ctx, id)
}
func (r *timetableEntryRepository) crossBookings(ctx context.Context, yearID, timetableID uuid.UUID) ([]crossBooking, error) {
	rows, err := r.queries.ListEntriesForYearExcludingTimetable(ctx, db.ListEntriesForYearExcludingTimetableParams{AcademicYearID: yearID, ID: timetableID})
	if err != nil {
		return nil, err
	}
	result := make([]crossBooking, len(rows))
	for i, row := range rows {
		result[i] = crossBooking{DayOfWeek: row.DayOfWeek, PeriodNumber: row.PeriodNumber, TeacherID: entryUUID(row.TeacherID), ClassroomID: entryUUID(row.ClassroomID), ClassName: row.ClassName, OptionBlockID: entryUUID(row.OptionBlockID)}
	}
	return result, nil
}
func (r *timetableEntryRepository) teacherUnavailable(ctx context.Context, teacherID, yearID uuid.UUID, day, period int16) (bool, error) {
	return r.queries.IsTeacherUnavailable(ctx, db.IsTeacherUnavailableParams{TeacherID: teacherID, AcademicYearID: yearID, DayOfWeek: day, PeriodNumber: period})
}
func (r *timetableEntryRepository) classSubjectTeacher(ctx context.Context, classID, subjectID uuid.UUID) (uuid.UUID, error) {
	return r.queries.GetClassSubjectTeacher(ctx, db.GetClassSubjectTeacherParams{ClassID: classID, SubjectID: subjectID})
}
func (r *timetableEntryRepository) teacherAssignedSubject(ctx context.Context, teacherID, subjectID uuid.UUID) (bool, error) {
	return r.queries.IsTeacherAssignedToSubject(ctx, db.IsTeacherAssignedToSubjectParams{TeacherID: teacherID, SubjectID: subjectID})
}
func (r *timetableEntryRepository) requirements(ctx context.Context, yearID, gradeID uuid.UUID) ([]requirementValue, error) {
	rows, err := r.queries.ListSubjectPeriodRequirementsByGrade(ctx, db.ListSubjectPeriodRequirementsByGradeParams{AcademicYearID: yearID, GradeID: gradeID})
	if err != nil {
		return nil, err
	}
	result := make([]requirementValue, len(rows))
	for i, row := range rows {
		result[i] = requirementValue{SubjectID: row.SubjectID, SubjectName: row.SubjectName, PeriodsPerWeek: row.PeriodsPerWeek}
	}
	return result, nil
}
func (r *timetableEntryRepository) entrySubjectCounts(ctx context.Context, timetableID uuid.UUID) (map[uuid.UUID]int32, error) {
	rows, err := r.queries.CountEntriesBySubjectForTimetable(ctx, timetableID)
	if err != nil {
		return nil, err
	}
	result := make(map[uuid.UUID]int32, len(rows))
	for _, row := range rows {
		if row.SubjectID.Valid {
			result[uuid.UUID(row.SubjectID.Bytes)] = row.EntryCount
		}
	}
	return result, nil
}
func (r *timetableEntryRepository) classLeaders(ctx context.Context, classID uuid.UUID) ([]uuid.UUID, error) {
	return r.queries.ListLeadersOfClass(ctx, classID)
}

func (r *timetableEntryRepository) blockTeachers(ctx context.Context, classID, blockID uuid.UUID) ([]blockTeacher, error) {
	rows, err := r.queries.ListOptionBlockTeachersForClass(ctx, db.ListOptionBlockTeachersForClassParams{ClassID: classID, BlockID: blockID})
	if err != nil {
		return nil, err
	}
	out := make([]blockTeacher, len(rows))
	for i, row := range rows {
		out[i] = blockTeacher{ID: row.TeacherID, Name: row.TeacherName}
	}
	return out, nil
}
