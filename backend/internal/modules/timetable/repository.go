package timetable

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type classroomRepository struct{ queries *db.Queries }

func newClassroomRepository(pool *pgxpool.Pool) *classroomRepository {
	return &classroomRepository{queries: db.New(pool)}
}
func (r *classroomRepository) create(ctx context.Context, command classroomCommand) (Classroom, error) {
	row, err := r.queries.CreateClassroom(ctx, db.CreateClassroomParams{
		Name: command.Name, Code: optionalClassroomText(command.Code), Capacity: optionalClassroomInt(command.Capacity),
		RoomType: command.RoomType, SubjectID: optionalClassroomUUID(command.SubjectID),
	})
	return mapClassroom(row), err
}
func (r *classroomRepository) list(ctx context.Context) ([]ClassroomListItem, error) {
	rows, err := r.queries.ListClassrooms(ctx)
	if err != nil {
		return nil, err
	}
	result := make([]ClassroomListItem, len(rows))
	for i, row := range rows {
		result[i] = ClassroomListItem{Classroom: Classroom{
			ID: row.ID, Name: row.Name, Code: classroomText(row.Code), Capacity: classroomInt(row.Capacity),
			CreatedAt: row.CreatedAt.Time, RoomType: row.RoomType, SubjectID: classroomUUID(row.SubjectID),
		}, SubjectName: classroomText(row.SubjectName)}
	}
	return result, nil
}
func (r *classroomRepository) update(ctx context.Context, id uuid.UUID, command classroomCommand) (Classroom, error) {
	row, err := r.queries.UpdateClassroom(ctx, db.UpdateClassroomParams{
		ID: id, Name: command.Name, Code: optionalClassroomText(command.Code), Capacity: optionalClassroomInt(command.Capacity),
		RoomType: command.RoomType, SubjectID: optionalClassroomUUID(command.SubjectID),
	})
	return mapClassroom(row), err
}
func (r *classroomRepository) delete(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteClassroom(ctx, id)
}
func optionalClassroomText(value string) pgtype.Text {
	return pgtype.Text{String: value, Valid: value != ""}
}
func optionalClassroomInt(value *int32) pgtype.Int4 {
	if value == nil {
		return pgtype.Int4{}
	}
	return pgtype.Int4{Int32: *value, Valid: true}
}
func optionalClassroomUUID(value *uuid.UUID) pgtype.UUID {
	if value == nil {
		return pgtype.UUID{}
	}
	return pgtype.UUID{Bytes: *value, Valid: true}
}
func classroomText(value pgtype.Text) *string {
	if !value.Valid {
		return nil
	}
	result := value.String
	return &result
}
func classroomInt(value pgtype.Int4) *int32 {
	if !value.Valid {
		return nil
	}
	result := value.Int32
	return &result
}
func classroomUUID(value pgtype.UUID) *uuid.UUID {
	if !value.Valid {
		return nil
	}
	result := uuid.UUID(value.Bytes)
	return &result
}
func mapClassroom(row db.Classroom) Classroom {
	return Classroom{ID: row.ID, Name: row.Name, Code: classroomText(row.Code), Capacity: classroomInt(row.Capacity), CreatedAt: row.CreatedAt.Time, RoomType: row.RoomType, SubjectID: classroomUUID(row.SubjectID)}
}

type subjectPeriodRequirementRepository struct{ queries *db.Queries }

func newSubjectPeriodRequirementRepository(pool *pgxpool.Pool) *subjectPeriodRequirementRepository {
	return &subjectPeriodRequirementRepository{queries: db.New(pool)}
}
func (r *subjectPeriodRequirementRepository) upsert(ctx context.Context, command subjectPeriodRequirementCommand) (SubjectPeriodRequirement, error) {
	row, err := r.queries.UpsertSubjectPeriodRequirement(ctx, db.UpsertSubjectPeriodRequirementParams{
		AcademicYearID: command.AcademicYearID, GradeID: command.GradeID, SubjectID: command.SubjectID,
		PeriodsPerWeek: command.PeriodsPerWeek, LabPeriodsPerWeek: command.LabPeriodsPerWeek,
		DoublePeriodBlocks: command.DoublePeriodBlocks,
	})
	return mapSubjectPeriodRequirement(row), err
}
func (r *subjectPeriodRequirementRepository) listByGrade(ctx context.Context, academicYearID, gradeID uuid.UUID) ([]SubjectPeriodRequirementListItem, error) {
	rows, err := r.queries.ListSubjectPeriodRequirementsByGrade(ctx, db.ListSubjectPeriodRequirementsByGradeParams{AcademicYearID: academicYearID, GradeID: gradeID})
	if err != nil {
		return nil, err
	}
	result := make([]SubjectPeriodRequirementListItem, len(rows))
	for i, row := range rows {
		result[i] = SubjectPeriodRequirementListItem{SubjectPeriodRequirement: SubjectPeriodRequirement{
			ID: row.ID, AcademicYearID: row.AcademicYearID, GradeID: row.GradeID, SubjectID: row.SubjectID,
			PeriodsPerWeek: row.PeriodsPerWeek, CreatedAt: row.CreatedAt.Time,
			LabPeriodsPerWeek: row.LabPeriodsPerWeek, DoublePeriodBlocks: row.DoublePeriodBlocks,
		}, SubjectName: row.SubjectName, SubjectCode: row.SubjectCode}
	}
	return result, nil
}
func (r *subjectPeriodRequirementRepository) deleteRequirement(ctx context.Context, id uuid.UUID) error {
	return r.queries.DeleteSubjectPeriodRequirement(ctx, id)
}
func mapSubjectPeriodRequirement(row db.SubjectPeriodRequirement) SubjectPeriodRequirement {
	return SubjectPeriodRequirement{
		ID: row.ID, AcademicYearID: row.AcademicYearID, GradeID: row.GradeID, SubjectID: row.SubjectID,
		PeriodsPerWeek: row.PeriodsPerWeek, CreatedAt: row.CreatedAt.Time,
		LabPeriodsPerWeek: row.LabPeriodsPerWeek, DoublePeriodBlocks: row.DoublePeriodBlocks,
	}
}

type teacherAvailabilityRepository struct{ queries *db.Queries }

func newTeacherAvailabilityRepository(pool *pgxpool.Pool) *teacherAvailabilityRepository {
	return &teacherAvailabilityRepository{queries: db.New(pool)}
}
func (r *teacherAvailabilityRepository) createAvailability(ctx context.Context, teacherID uuid.UUID, command teacherAvailabilityCommand) (TeacherAvailability, error) {
	row, err := r.queries.CreateTeacherAvailability(ctx, db.CreateTeacherAvailabilityParams{
		TeacherID: teacherID, AcademicYearID: command.AcademicYearID,
		DayOfWeek: command.DayOfWeek, PeriodNumber: command.PeriodNumber,
	})
	return mapTeacherAvailability(row), err
}
func (r *teacherAvailabilityRepository) listAvailability(ctx context.Context, teacherID, academicYearID uuid.UUID) ([]TeacherAvailability, error) {
	rows, err := r.queries.ListTeacherAvailabilityByTeacherYear(ctx, db.ListTeacherAvailabilityByTeacherYearParams{TeacherID: teacherID, AcademicYearID: academicYearID})
	if err != nil {
		return nil, err
	}
	result := make([]TeacherAvailability, len(rows))
	for i, row := range rows {
		result[i] = mapTeacherAvailability(row)
	}
	return result, nil
}
func (r *teacherAvailabilityRepository) deleteAvailability(ctx context.Context, id uuid.UUID) error {
	return r.queries.DeleteTeacherAvailability(ctx, id)
}
func mapTeacherAvailability(row db.TeacherAvailability) TeacherAvailability {
	return TeacherAvailability{
		ID: row.ID, TeacherID: row.TeacherID, AcademicYearID: row.AcademicYearID,
		DayOfWeek: row.DayOfWeek, PeriodNumber: row.PeriodNumber, CreatedAt: row.CreatedAt.Time,
	}
}

type gradeSectionRepository struct{ queries *db.Queries }

func newGradeSectionRepository(pool *pgxpool.Pool) *gradeSectionRepository {
	return &gradeSectionRepository{queries: db.New(pool)}
}
func (r *gradeSectionRepository) createSection(ctx context.Context, command gradeSectionCommand, start, end int64) (gradeSectionRecord, error) {
	row, err := r.queries.CreateGradeSection(ctx, db.CreateGradeSectionParams{
		AcademicYearID: command.AcademicYearID, Name: command.Name,
		IntervalStartTime: pgtype.Time{Microseconds: start, Valid: true}, IntervalEndTime: pgtype.Time{Microseconds: end, Valid: true},
		SectionHeadTeacherID: optionalClassroomUUID(command.SectionHeadTeacherID), SortOrder: command.SortOrder,
	})
	return mapGradeSectionRecord(row), err
}
func (r *gradeSectionRepository) getSection(ctx context.Context, id uuid.UUID) (gradeSectionRecord, error) {
	row, err := r.queries.GetGradeSectionByID(ctx, id)
	return mapGradeSectionRecord(row), err
}
func (r *gradeSectionRepository) listSections(ctx context.Context, yearID uuid.UUID) ([]gradeSectionRecord, error) {
	rows, err := r.queries.ListGradeSectionsByYear(ctx, yearID)
	if err != nil {
		return nil, err
	}
	result := make([]gradeSectionRecord, len(rows))
	for i, row := range rows {
		result[i] = gradeSectionRecord{
			ID: row.ID, AcademicYearID: row.AcademicYearID, Name: row.Name,
			IntervalStartMicroseconds: row.IntervalStartTime.Microseconds, IntervalEndMicroseconds: row.IntervalEndTime.Microseconds,
			SectionHeadTeacherID: classroomUUID(row.SectionHeadTeacherID), SectionHeadName: classroomText(row.SectionHeadName), SortOrder: row.SortOrder,
		}
	}
	return result, nil
}
func (r *gradeSectionRepository) updateSection(ctx context.Context, id uuid.UUID, command updateGradeSectionCommand, start, end int64) error {
	_, err := r.queries.UpdateGradeSection(ctx, db.UpdateGradeSectionParams{
		ID: id, Name: command.Name, IntervalStartTime: pgtype.Time{Microseconds: start, Valid: true},
		IntervalEndTime:      pgtype.Time{Microseconds: end, Valid: true},
		SectionHeadTeacherID: optionalClassroomUUID(command.SectionHeadTeacherID), SortOrder: command.SortOrder,
	})
	return err
}
func (r *gradeSectionRepository) deleteSection(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteGradeSection(ctx, id)
}
func (r *gradeSectionRepository) assignGrade(ctx context.Context, sectionID, gradeID, yearID uuid.UUID) error {
	return r.queries.AssignGradeToSection(ctx, db.AssignGradeToSectionParams{GradeSectionID: sectionID, GradeID: gradeID, AcademicYearID: yearID})
}
func (r *gradeSectionRepository) removeGrade(ctx context.Context, sectionID, gradeID uuid.UUID) error {
	return r.queries.RemoveGradeFromSection(ctx, db.RemoveGradeFromSectionParams{GradeSectionID: sectionID, GradeID: gradeID})
}
func (r *gradeSectionRepository) listGradeIDs(ctx context.Context, sectionID uuid.UUID) ([]uuid.UUID, error) {
	rows, err := r.queries.ListGradesBySection(ctx, sectionID)
	if err != nil {
		return nil, err
	}
	result := make([]uuid.UUID, len(rows))
	for i, row := range rows {
		result[i] = row.ID
	}
	return result, nil
}
func (r *gradeSectionRepository) createPeriod(ctx context.Context, values periodValues) (TimetablePeriod, error) {
	row, err := r.queries.CreateTimetablePeriod(ctx, db.CreateTimetablePeriodParams{
		GradeSectionID: values.GradeSectionID, SortOrder: values.SortOrder, PeriodNumber: optionalClassroomInt(values.PeriodNumber),
		StartTime: pgtype.Time{Microseconds: values.StartMicroseconds, Valid: true}, EndTime: pgtype.Time{Microseconds: values.EndMicroseconds, Valid: true}, SlotType: values.SlotType,
	})
	return mapTimetablePeriod(row), err
}
func (r *gradeSectionRepository) listPeriods(ctx context.Context, sectionID uuid.UUID) ([]TimetablePeriod, error) {
	rows, err := r.queries.ListTimetablePeriodsBySection(ctx, sectionID)
	if err != nil {
		return nil, err
	}
	result := make([]TimetablePeriod, len(rows))
	for i, row := range rows {
		result[i] = mapTimetablePeriod(row)
	}
	return result, nil
}
func (r *gradeSectionRepository) deletePeriods(ctx context.Context, sectionID uuid.UUID) error {
	return r.queries.DeleteTimetablePeriodsBySection(ctx, sectionID)
}
func (r *gradeSectionRepository) getSettingsValues(ctx context.Context, yearID uuid.UUID) (settingsValues, error) {
	row, err := r.queries.GetTimetableSettingsByYear(ctx, yearID)
	if err != nil {
		return settingsValues{}, err
	}
	return settingsValues{
		AcademicYearID: row.AcademicYearID, StartMicroseconds: row.SchoolStartTime.Microseconds, EndMicroseconds: row.SchoolEndTime.Microseconds,
		NumberOfPeriods: row.NumberOfPeriods, PeriodDurationMinutes: row.PeriodDurationMinutes, IntervalDurationMinutes: row.IntervalDurationMinutes,
	}, nil
}
func mapGradeSectionRecord(row db.GradeSection) gradeSectionRecord {
	return gradeSectionRecord{
		ID: row.ID, AcademicYearID: row.AcademicYearID, Name: row.Name,
		IntervalStartMicroseconds: row.IntervalStartTime.Microseconds, IntervalEndMicroseconds: row.IntervalEndTime.Microseconds,
		SectionHeadTeacherID: classroomUUID(row.SectionHeadTeacherID), SortOrder: row.SortOrder,
	}
}
func mapTimetablePeriod(row db.TimetablePeriod) TimetablePeriod {
	return TimetablePeriod{
		ID: row.ID, SortOrder: row.SortOrder, PeriodNumber: classroomInt(row.PeriodNumber),
		StartTime: formatClock(row.StartTime), EndTime: formatClock(row.EndTime), SlotType: row.SlotType,
	}
}

type timetableEntryRepository struct{ queries *db.Queries }

func newTimetableEntryRepository(pool *pgxpool.Pool) *timetableEntryRepository {
	return &timetableEntryRepository{queries: db.New(pool)}
}

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

func (r *timetableRepository) authorizedReviewers(ctx context.Context, gradeID, yearID uuid.UUID) ([]uuid.UUID, error) {
	result := make([]uuid.UUID, 0, 2)
	tic, err := r.queries.GetGradeTICForGrade(ctx, db.GetGradeTICForGradeParams{AcademicYearID: yearID, GradeID: gradeID})
	if err == nil {
		result = append(result, tic)
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	section, err := r.queries.GetGradeSectionForGrade(ctx, db.GetGradeSectionForGradeParams{AcademicYearID: yearID, GradeID: gradeID})
	if err == nil && section.SectionHeadTeacherID.Valid {
		result = append(result, uuid.UUID(section.SectionHeadTeacherID.Bytes))
	} else if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	return result, nil
}

func (r *timetableRepository) gradeIDsHeadedByTeacher(ctx context.Context, teacherID, yearID uuid.UUID) ([]uuid.UUID, error) {
	return r.queries.ListGradeIDsHeadedByTeacher(ctx, db.ListGradeIDsHeadedByTeacherParams{TeacherID: teacherID, AcademicYearID: yearID})
}

func (r *timetableRepository) gradeIDsForSectionHead(ctx context.Context, teacherID, yearID uuid.UUID) ([]uuid.UUID, error) {
	return r.queries.ListGradeIDsForSectionHeadTeacher(ctx, db.ListGradeIDsForSectionHeadTeacherParams{SectionHeadTeacherID: pgtype.UUID{Bytes: teacherID, Valid: true}, AcademicYearID: yearID})
}

func (r *timetableRepository) listReviewQueue(ctx context.Context, yearID uuid.UUID, gradeIDs []uuid.UUID) ([]reviewQueueItem, error) {
	rows, err := r.queries.ListUnderReviewTimetablesForGrades(ctx, db.ListUnderReviewTimetablesForGradesParams{AcademicYearID: yearID, Column2: gradeIDs})
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
			ClassroomID: entryUUID(row.ClassroomID), ClassroomName: entryText(row.ClassroomName), ClassID: row.ClassID, ClassName: row.ClassName, GradeName: row.GradeName,
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
			TeacherName: entryText(row.TeacherName), ClassroomName: entryText(row.ClassroomName),
			OptionBlockID: entryUUID(row.OptionBlockID), OptionBlockName: entryText(row.OptionBlockName),
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
func (r *timetableEntryRepository) authorizedReviewers(ctx context.Context, yearID, gradeID uuid.UUID) ([]uuid.UUID, error) {
	result := make([]uuid.UUID, 0, 2)
	tic, err := r.queries.GetGradeTICForGrade(ctx, db.GetGradeTICForGradeParams{AcademicYearID: yearID, GradeID: gradeID})
	if err == nil {
		result = append(result, tic)
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	section, err := r.queries.GetGradeSectionForGrade(ctx, db.GetGradeSectionForGradeParams{AcademicYearID: yearID, GradeID: gradeID})
	if err == nil && section.SectionHeadTeacherID.Valid {
		result = append(result, uuid.UUID(section.SectionHeadTeacherID.Bytes))
	} else if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	return result, nil
}

type settingsRepository struct{ queries *db.Queries }

func newSettingsRepository(pool *pgxpool.Pool) *settingsRepository {
	return &settingsRepository{queries: db.New(pool)}
}
func (r *settingsRepository) upsert(ctx context.Context, values settingsValues) (Settings, error) {
	row, err := r.queries.UpsertTimetableSettings(ctx, db.UpsertTimetableSettingsParams{AcademicYearID: values.AcademicYearID, SchoolStartTime: pgtype.Time{Microseconds: values.StartMicroseconds, Valid: true}, SchoolEndTime: pgtype.Time{Microseconds: values.EndMicroseconds, Valid: true}, NumberOfPeriods: values.NumberOfPeriods, PeriodDurationMinutes: values.PeriodDurationMinutes, IntervalDurationMinutes: values.IntervalDurationMinutes})
	return mapSettings(row), err
}
func (r *settingsRepository) getByYear(ctx context.Context, yearID uuid.UUID) (Settings, error) {
	row, err := r.queries.GetTimetableSettingsByYear(ctx, yearID)
	return mapSettings(row), err
}
func formatClock(value pgtype.Time) string {
	if !value.Valid {
		return ""
	}
	seconds := value.Microseconds / 1_000_000
	return fmt.Sprintf("%02d:%02d", seconds/3600, (seconds%3600)/60)
}
func mapSettings(row db.TimetableSetting) Settings {
	return Settings{AcademicYearID: row.AcademicYearID, SchoolStartTime: formatClock(row.SchoolStartTime), SchoolEndTime: formatClock(row.SchoolEndTime), NumberOfPeriods: row.NumberOfPeriods, PeriodDurationMinutes: row.PeriodDurationMinutes, IntervalDurationMinutes: row.IntervalDurationMinutes}
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
