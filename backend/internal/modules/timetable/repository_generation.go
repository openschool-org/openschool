package timetable

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/openschool-org/openschool/db/sqlc"
)

func (r *timetableRepository) classesByGradeSection(ctx context.Context, sectionID, yearID uuid.UUID) ([]generationClass, error) {
	rows, err := r.queries.ListClassesByGradeSection(ctx, db.ListClassesByGradeSectionParams{GradeSectionID: sectionID, AcademicYearID: yearID})
	if err != nil {
		return nil, err
	}
	result := make([]generationClass, len(rows))
	for i, row := range rows {
		result[i] = generationClass{ID: row.ID, GradeID: row.GradeID, Name: row.Name, HomeClassroomID: entryUUID(row.HomeClassroomID), FormTeacherID: entryUUID(row.FormTeacherID)}
	}
	return result, nil
}

func (r *timetableRepository) latestTimetablesByClass(ctx context.Context, classID, yearID uuid.UUID) ([]TimetableListItem, error) {
	return r.listByClass(ctx, classID, yearID)
}

func (r *timetableRepository) allBookings(ctx context.Context, yearID uuid.UUID) ([]generationBusy, error) {
	rows, err := r.queries.ListAllTimetableEntriesForYear(ctx, yearID)
	if err != nil {
		return nil, err
	}
	result := make([]generationBusy, len(rows))
	for i, row := range rows {
		result[i] = generationBusy{Day: row.DayOfWeek, Period: row.PeriodNumber, TeacherID: entryUUID(row.TeacherID), ClassroomID: entryUUID(row.ClassroomID), ClassName: row.ClassName}
	}
	return result, nil
}

func (r *timetableRepository) periods(ctx context.Context, sectionID uuid.UUID) ([]generationPeriod, error) {
	rows, err := r.queries.ListTimetablePeriodsBySection(ctx, sectionID)
	if err != nil {
		return nil, err
	}
	result := make([]generationPeriod, len(rows))
	for i, row := range rows {
		result[i] = generationPeriod{Number: classroomInt(row.PeriodNumber), SlotType: row.SlotType}
	}
	return result, nil
}

func (r *timetableRepository) subjectTeachers(ctx context.Context, classID uuid.UUID) ([]generationTeacherSubject, error) {
	rows, err := r.queries.ListSubjectTeachersByClass(ctx, classID)
	if err != nil {
		return nil, err
	}
	result := make([]generationTeacherSubject, len(rows))
	for i, row := range rows {
		result[i] = generationTeacherSubject{SubjectID: row.SubjectID, TeacherID: row.TeacherID, TeacherName: row.TeacherName}
	}
	return result, nil
}

func (r *timetableRepository) requirementsForGrade(ctx context.Context, yearID, gradeID uuid.UUID) ([]generationRequirement, error) {
	rows, err := r.queries.ListSubjectPeriodRequirementsByGrade(ctx, db.ListSubjectPeriodRequirementsByGradeParams{AcademicYearID: yearID, GradeID: gradeID})
	if err != nil {
		return nil, err
	}
	result := make([]generationRequirement, len(rows))
	for i, row := range rows {
		result[i] = generationRequirement{SubjectID: row.SubjectID, SubjectName: row.SubjectName, Periods: row.PeriodsPerWeek, LabPeriods: row.LabPeriodsPerWeek, DoubleBlocks: row.DoublePeriodBlocks}
	}
	return result, nil
}

func (r *timetableRepository) teacherName(ctx context.Context, teacherID uuid.UUID) (string, error) {
	row, err := r.queries.GetTeacherByID(ctx, teacherID)
	return row.FullName, err
}

func (r *timetableRepository) availability(ctx context.Context, teacherID, yearID uuid.UUID) ([]generationAvailability, error) {
	rows, err := r.queries.ListTeacherAvailabilityByTeacherYear(ctx, db.ListTeacherAvailabilityByTeacherYearParams{TeacherID: teacherID, AcademicYearID: yearID})
	if err != nil {
		return nil, err
	}
	result := make([]generationAvailability, len(rows))
	for i, row := range rows {
		result[i] = generationAvailability{Day: row.DayOfWeek, Period: row.PeriodNumber}
	}
	return result, nil
}

func (r *timetableRepository) labsForSubject(ctx context.Context, subjectID uuid.UUID) ([]Classroom, error) {
	rows, err := r.queries.ListClassroomsBySubject(ctx, pgtype.UUID{Bytes: subjectID, Valid: true})
	if err != nil {
		return nil, err
	}
	result := make([]Classroom, len(rows))
	for i, row := range rows {
		result[i] = mapClassroom(row)
	}
	return result, nil
}

func (r *timetableRepository) upsertGeneratedEntry(ctx context.Context, timetableID uuid.UUID, day, period int16, subjectID, teacherID uuid.UUID, classroomID *uuid.UUID) error {
	params := db.UpsertTimetableEntryParams{TimetableID: timetableID, DayOfWeek: day, PeriodNumber: period, SubjectID: pgtype.UUID{Bytes: subjectID, Valid: true}, TeacherID: pgtype.UUID{Bytes: teacherID, Valid: true}}
	if classroomID != nil {
		params.ClassroomID = pgtype.UUID{Bytes: *classroomID, Valid: true}
	}
	_, err := r.queries.UpsertTimetableEntry(ctx, params)
	return err
}

// OptionBlock is a set of option subjects (an O/L basket, A/L options) taught at the same
// period in every class that shares it; each class's students split up by subject.
type OptionBlock struct {
	ID       uuid.UUID
	GradeID  uuid.UUID
	Name     string
	Periods  int32
	Subjects []uuid.UUID
	Classes  []uuid.UUID
}

// optionBlocks loads the blocks that include any of these classes, with their subjects and classes.
func (r *timetableRepository) optionBlocks(ctx context.Context, classIDs []uuid.UUID) ([]OptionBlock, error) {
	rows, err := r.queries.ListOptionBlocksForClasses(ctx, classIDs)
	if err != nil || len(rows) == 0 {
		return nil, err
	}
	ids := make([]uuid.UUID, len(rows))
	out := make([]OptionBlock, len(rows))
	index := map[uuid.UUID]int{}
	for i, row := range rows {
		ids[i] = row.ID
		index[row.ID] = i
		out[i] = OptionBlock{ID: row.ID, GradeID: row.GradeID, Name: row.Name, Periods: row.PeriodsPerWeek}
	}
	classes, err := r.queries.ListOptionBlockClasses(ctx, ids)
	if err != nil {
		return nil, err
	}
	for _, c := range classes {
		out[index[c.BlockID]].Classes = append(out[index[c.BlockID]].Classes, c.ClassID)
	}
	subjects, err := r.queries.ListOptionBlockSubjects(ctx, ids)
	if err != nil {
		return nil, err
	}
	for _, s := range subjects {
		out[index[s.BlockID]].Subjects = append(out[index[s.BlockID]].Subjects, s.SubjectID)
	}
	return out, nil
}

func (r *timetableRepository) upsertBlockEntry(ctx context.Context, timetableID uuid.UUID, day, period int16, blockID uuid.UUID) error {
	return r.queries.UpsertOptionBlockEntry(ctx, db.UpsertOptionBlockEntryParams{TimetableID: timetableID, DayOfWeek: day, PeriodNumber: period, OptionBlockID: pgtype.UUID{Bytes: blockID, Valid: true}})
}

// GenerateWith runs the generator for one grade section on the given queries, so a caller can
// run it inside its own transaction (the year-end timetable workflow uses this for its dry run).
func GenerateWith(ctx context.Context, queries *db.Queries, request GenerationRequest, actor uuid.UUID) (GenerationResult, error) {
	return (&generationService{store: &timetableRepository{queries: queries}}).generate(ctx, request, actor)
}
