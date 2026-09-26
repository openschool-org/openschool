package academics

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type subjectRepository struct{ queries *db.Queries }

func newSubjectRepository(pool *pgxpool.Pool) *subjectRepository {
	return &subjectRepository{queries: db.New(pool)}
}

func (r *subjectRepository) create(ctx context.Context, command normalizedSubjectCommand) (Subject, error) {
	params, err := subjectParams(command)
	if err != nil {
		return Subject{}, err
	}
	row, err := r.queries.CreateSubject(ctx, db.CreateSubjectParams{Name: params.Name, Code: params.Code, Type: params.Type, MaxMarks: params.MaxMarks})
	return mapSubject(row), err
}
func (r *subjectRepository) get(ctx context.Context, id uuid.UUID) (Subject, error) {
	row, err := r.queries.GetSubjectByID(ctx, id)
	return mapSubject(row), err
}
func (r *subjectRepository) list(ctx context.Context) ([]Subject, error) {
	rows, err := r.queries.ListSubjects(ctx)
	if err != nil {
		return nil, err
	}
	result := make([]Subject, len(rows))
	for i, row := range rows {
		result[i] = mapSubject(row)
	}
	return result, nil
}
func (r *subjectRepository) update(ctx context.Context, id uuid.UUID, command normalizedSubjectCommand) (Subject, error) {
	params, err := subjectParams(command)
	if err != nil {
		return Subject{}, err
	}
	row, err := r.queries.UpdateSubject(ctx, db.UpdateSubjectParams{ID: id, Name: params.Name, Code: params.Code, Type: params.Type, MaxMarks: params.MaxMarks})
	return mapSubject(row), err
}
func (r *subjectRepository) delete(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteSubject(ctx, id)
}

func subjectParams(command normalizedSubjectCommand) (db.CreateSubjectParams, error) {
	var numeric pgtype.Numeric
	if err := numeric.Scan(strconv.FormatFloat(command.MaxMarks, 'f', 2, 64)); err != nil {
		return db.CreateSubjectParams{}, fmt.Errorf("failed to convert %v to numeric: %w", command.MaxMarks, err)
	}
	return db.CreateSubjectParams{Name: command.Name, Code: command.Code, Type: pgtype.Text{String: command.Type, Valid: command.Type != ""}, MaxMarks: numeric}, nil
}

func mapSubject(row db.Subject) Subject {
	var subjectType *string
	if row.Type.Valid {
		value := row.Type.String
		subjectType = &value
	}
	maxMarks := float64(0)
	if value, err := row.MaxMarks.Float64Value(); err == nil && value.Valid {
		maxMarks = value.Float64
	}
	return Subject{ID: row.ID.String(), Name: row.Name, Code: row.Code, Type: subjectType, MaxMarks: maxMarks, CreatedAt: row.CreatedAt.Time.String()}
}

type streamRepository struct{ queries *db.Queries }

func newStreamRepository(pool *pgxpool.Pool) *streamRepository {
	return &streamRepository{queries: db.New(pool)}
}

type classRepository struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func newClassRepository(pool *pgxpool.Pool) *classRepository {
	return &classRepository{pool: pool, queries: db.New(pool)}
}

// homeroomFor returns the regular room named after the class, creating it if missing.
// A lab or ECA room that happens to share the name is never used as a homeroom.
func homeroomFor(ctx context.Context, q *db.Queries, className string) (pgtype.UUID, error) {
	room, err := q.FindClassroomByName(ctx, className)
	if err == nil {
		if room.RoomType != "regular" {
			return pgtype.UUID{}, nil
		}
		return pgtype.UUID{Bytes: room.ID, Valid: true}, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return pgtype.UUID{}, err
	}
	created, err := q.CreateClassroom(ctx, db.CreateClassroomParams{Name: className, RoomType: "regular"})
	if err != nil {
		return pgtype.UUID{}, err
	}
	return pgtype.UUID{Bytes: created.ID, Valid: true}, nil
}

func classUUID(v pgtype.UUID) *uuid.UUID {
	if !v.Valid {
		return nil
	}
	id := uuid.UUID(v.Bytes)
	return &id
}
func classText(v pgtype.Text) *string {
	if !v.Valid {
		return nil
	}
	value := v.String
	return &value
}
func mapClass(v db.Class) Class {
	return Class{ID: v.ID, GradeID: v.GradeID, AcademicYearID: v.AcademicYearID, FormTeacherID: classUUID(v.FormTeacherID), StreamID: classUUID(v.StreamID), StreamGroupID: classUUID(v.StreamGroupID), Name: v.Name, CreatedAt: v.CreatedAt.Time.String(), GirlMonitorID: classUUID(v.GirlMonitorID), BoyMonitorID: classUUID(v.BoyMonitorID), MediumID: classUUID(v.MediumID), HomeClassroomID: classUUID(v.HomeClassroomID)}
}
func mapDetails(id, grade, year uuid.UUID, form, stream, streamGroup, girl, boy, medium, room pgtype.UUID, name string, created pgtype.Timestamptz, gradeName, yearLabel string, mediumName, roomName pgtype.Text) ClassDetails {
	return ClassDetails{Class: Class{ID: id, GradeID: grade, AcademicYearID: year, FormTeacherID: classUUID(form), StreamID: classUUID(stream), StreamGroupID: classUUID(streamGroup), GirlMonitorID: classUUID(girl), BoyMonitorID: classUUID(boy), MediumID: classUUID(medium), HomeClassroomID: classUUID(room), Name: name, CreatedAt: created.Time.String()}, GradeName: gradeName, AcademicYearLabel: yearLabel, MediumName: classText(mediumName), HomeClassroomName: classText(roomName)}
}
func classUUIDParam(v *uuid.UUID) pgtype.UUID {
	if v == nil {
		return pgtype.UUID{}
	}
	return pgtype.UUID{Bytes: *v, Valid: true}
}

// create links a homeroom in the same transaction when the caller gives none, so every
// path (setup wizard, Add class, future workflows) gets one.
func (r *classRepository) create(ctx context.Context, v createClassRequest) (Class, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return Class{}, err
	}
	defer tx.Rollback(ctx)
	q := r.queries.WithTx(tx)
	room := classUUIDParam(v.HomeClassroomID)
	if !room.Valid {
		if room, err = homeroomFor(ctx, q, strings.TrimSpace(v.Name)); err != nil {
			return Class{}, err
		}
	}
	row, err := q.CreateClass(ctx, db.CreateClassParams{GradeID: v.GradeID, AcademicYearID: v.AcademicYearID, Name: v.Name, FormTeacherID: classUUIDParam(v.FormTeacherID), StreamID: classUUIDParam(v.StreamID), StreamGroupID: classUUIDParam(v.StreamGroupID), MediumID: classUUIDParam(v.MediumID), HomeClassroomID: room})
	if err != nil {
		return Class{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Class{}, err
	}
	return mapClass(row), nil
}

// backfillHomerooms gives every class in the year without a homeroom one named after it.
func (r *classRepository) backfillHomerooms(ctx context.Context, year uuid.UUID) (int, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)
	q := r.queries.WithTx(tx)
	classes, err := q.ListClassesWithoutHomeroom(ctx, year)
	if err != nil {
		return 0, err
	}
	linked := 0
	for _, c := range classes {
		room, err := homeroomFor(ctx, q, c.Name)
		if err != nil {
			return 0, err
		}
		if !room.Valid {
			continue
		}
		if err := q.SetClassHomeClassroom(ctx, db.SetClassHomeClassroomParams{ID: c.ID, HomeClassroomID: room}); err != nil {
			return 0, err
		}
		linked++
	}
	return linked, tx.Commit(ctx)
}
func (r *classRepository) get(ctx context.Context, id uuid.UUID) (Class, error) {
	v, e := r.queries.GetClassByID(ctx, id)
	return mapClass(v), e
}
func (r *classRepository) listCurrent(ctx context.Context) ([]ClassDetails, error) {
	rows, e := r.queries.ListCurrentClasses(ctx)
	if e != nil {
		return nil, e
	}
	out := make([]ClassDetails, len(rows))
	for i, v := range rows {
		out[i] = mapDetails(v.ID, v.GradeID, v.AcademicYearID, v.FormTeacherID, v.StreamID, v.StreamGroupID, v.GirlMonitorID, v.BoyMonitorID, v.MediumID, v.HomeClassroomID, v.Name, v.CreatedAt, v.GradeName, v.AcademicYearLabel, v.MediumName, v.HomeClassroomName)
	}
	return out, nil
}
func (r *classRepository) listByYear(ctx context.Context, id uuid.UUID) ([]ClassDetails, error) {
	rows, e := r.queries.ListClassesByAcademicYear(ctx, id)
	if e != nil {
		return nil, e
	}
	out := make([]ClassDetails, len(rows))
	for i, v := range rows {
		out[i] = mapDetails(v.ID, v.GradeID, v.AcademicYearID, v.FormTeacherID, v.StreamID, v.StreamGroupID, v.GirlMonitorID, v.BoyMonitorID, v.MediumID, v.HomeClassroomID, v.Name, v.CreatedAt, v.GradeName, v.AcademicYearLabel, v.MediumName, v.HomeClassroomName)
	}
	return out, nil
}
func (r *classRepository) update(ctx context.Context, id uuid.UUID, v updateClassRequest) (Class, error) {
	row, e := r.queries.UpdateClass(ctx, db.UpdateClassParams{ID: id, Name: v.Name, FormTeacherID: classUUIDParam(v.FormTeacherID), MediumID: classUUIDParam(v.MediumID), HomeClassroomID: classUUIDParam(v.HomeClassroomID)})
	return mapClass(row), e
}
func (r *classRepository) delete(ctx context.Context, id uuid.UUID) error {
	return r.queries.DeleteClass(ctx, id)
}
func (r *classRepository) studentCount(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.GetClassStudentCount(ctx, id)
}
func (r *classRepository) assignFormTeacher(ctx context.Context, id, teacher uuid.UUID) (Class, error) {
	row, e := r.queries.AssignFormTeacher(ctx, db.AssignFormTeacherParams{ID: id, FormTeacherID: classUUIDParam(&teacher)})
	return mapClass(row), e
}
func (r *classRepository) assignMonitors(ctx context.Context, id uuid.UUID, girl, boy *uuid.UUID) (Class, error) {
	row, e := r.queries.AssignClassMonitors(ctx, db.AssignClassMonitorsParams{ID: id, GirlMonitorID: classUUIDParam(girl), BoyMonitorID: classUUIDParam(boy)})
	return mapClass(row), e
}
func (r *classRepository) qualified(ctx context.Context, teacher, subject uuid.UUID) (bool, error) {
	rows, e := r.queries.ListSubjectsByTeacher(ctx, teacher)
	if e != nil {
		return false, e
	}
	for _, v := range rows {
		if v.ID == subject {
			return true, nil
		}
	}
	return false, nil
}
func (r *classRepository) assignSubjectTeacher(ctx context.Context, id, subject, teacher uuid.UUID) error {
	return r.queries.AssignSubjectTeacherToClass(ctx, db.AssignSubjectTeacherToClassParams{ClassID: id, SubjectID: subject, TeacherID: teacher})
}
func (r *classRepository) listSubjectTeachers(ctx context.Context, id uuid.UUID) ([]SubjectTeacher, error) {
	rows, e := r.queries.ListSubjectTeachersByClass(ctx, id)
	if e != nil {
		return nil, e
	}
	out := make([]SubjectTeacher, len(rows))
	for i, v := range rows {
		out[i] = SubjectTeacher{SubjectID: v.SubjectID, SubjectName: v.SubjectName, SubjectCode: v.SubjectCode, TeacherID: v.TeacherID, TeacherName: v.TeacherName}
	}
	return out, nil
}
func (r *classRepository) enroll(ctx context.Context, id, student uuid.UUID) error {
	return r.queries.EnrollStudentInClass(ctx, db.EnrollStudentInClassParams{ClassID: id, StudentID: student})
}
func (r *classRepository) unenroll(ctx context.Context, id, student uuid.UUID) error {
	return r.queries.UnenrollStudentFromClass(ctx, db.UnenrollStudentFromClassParams{ClassID: id, StudentID: student})
}

type enrollmentRepository struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

type promotionRepository struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func newPromotionRepository(pool *pgxpool.Pool) *promotionRepository {
	return &promotionRepository{pool: pool, queries: db.New(pool)}
}
func NewPromotionRepository(pool *pgxpool.Pool) promotionStore { return newPromotionRepository(pool) }
func (r *promotionRepository) students(ctx context.Context, year uuid.UUID) ([]promotionStudent, error) {
	rows, err := r.queries.ListActiveStudentsForYear(ctx, year)
	if err != nil {
		return nil, err
	}
	out := make([]promotionStudent, len(rows))
	for i, v := range rows {
		out[i] = promotionStudent{ID: v.StudentID, Name: v.StudentName, Index: v.StudentIndex, ClassID: v.ClassID, ClassName: v.ClassName, GradeID: v.GradeID, GradeName: v.GradeName, MediumID: enrollmentUUID(v.MediumID), MediumName: enrollmentText(v.MediumName)}
	}
	return out, nil
}
func (r *promotionRepository) nextGrade(ctx context.Context, id uuid.UUID) (promotionGrade, error) {
	v, err := r.queries.GetNextGrade(ctx, id)
	return promotionGrade{ID: v.ID, Name: v.Name}, err
}
func (r *promotionRepository) classByName(ctx context.Context, grade, year uuid.UUID, name string) (promotionClass, error) {
	v, err := r.queries.FindClassByGradeAndName(ctx, db.FindClassByGradeAndNameParams{GradeID: grade, AcademicYearID: year, Name: name})
	return promotionClass{ID: v.ID, Name: v.Name}, err
}
func (r *promotionRepository) classByMedium(ctx context.Context, grade, year uuid.UUID, medium string) (promotionClass, error) {
	id, err := uuid.Parse(medium)
	if err != nil {
		return promotionClass{}, err
	}
	v, err := r.queries.FindClassByGradeAndMedium(ctx, db.FindClassByGradeAndMediumParams{GradeID: grade, AcademicYearID: year, MediumID: pgtype.UUID{Bytes: id, Valid: true}})
	return promotionClass{ID: v.ID, Name: v.Name}, err
}
func (r *promotionRepository) marks(ctx context.Context, term uuid.UUID, ids []uuid.UUID) ([]promotionMarks, error) {
	rows, err := r.queries.ListStudentTotalMarksForTerm(ctx, db.ListStudentTotalMarksForTermParams{TermID: term, StudentIds: ids})
	if err != nil {
		return nil, err
	}
	out := make([]promotionMarks, len(rows))
	for i, v := range rows {
		out[i] = promotionMarks{ID: v.StudentID, Total: v.TotalMarks, Max: v.TotalMaxMarks}
	}
	return out, nil
}
func (r *promotionRepository) validClasses(ctx context.Context, year uuid.UUID, ids []uuid.UUID) (int64, error) {
	return r.queries.CountClassesInYearByIDs(ctx, db.CountClassesInYearByIDsParams{AcademicYearID: year, ClassIds: ids})
}
func (r *promotionRepository) commit(ctx context.Context, year uuid.UUID, students, classes []uuid.UUID) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	q := r.queries.WithTx(tx)
	if err = q.BulkDeleteClassStudentsForYear(ctx, db.BulkDeleteClassStudentsForYearParams{AcademicYearID: year, StudentIds: students}); err != nil {
		return err
	}
	if err = q.BulkInsertClassStudents(ctx, db.BulkInsertClassStudentsParams{ClassIds: classes, StudentIds: students}); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

type termMarkRepository struct{ queries *db.Queries }

func newTermMarkRepository(pool *pgxpool.Pool) *termMarkRepository {
	return &termMarkRepository{queries: db.New(pool)}
}
func NewTermMarkRepository(pool *pgxpool.Pool) termMarkStore { return newTermMarkRepository(pool) }
func (r *termMarkRepository) authorizeSubject(ctx context.Context, a TermMarkActor, class, subject uuid.UUID) error {
	if a.Role == "admin" {
		return nil
	}
	teacher, e := r.queries.GetTeacherByUserID(ctx, a.ID)
	if e != nil {
		return errors.New("only teachers assigned to a subject can enter its marks")
	}
	assigned, e := r.queries.GetClassSubjectTeacher(ctx, db.GetClassSubjectTeacherParams{ClassID: class, SubjectID: subject})
	if e != nil {
		return errors.New("no teacher is assigned to teach this subject for this class")
	}
	if assigned != teacher.ID {
		return ErrNotAssignedToSubject
	}
	return nil
}
func (r *termMarkRepository) enrolled(ctx context.Context, class uuid.UUID, ids []uuid.UUID) ([]uuid.UUID, error) {
	return r.queries.ListStudentsEnrolledInCurrentClass(ctx, db.ListStudentsEnrolledInCurrentClassParams{ClassID: class, StudentIds: ids})
}
func (r *termMarkRepository) upsert(ctx context.Context, student, subject, term uuid.UUID, m, max pgtype.Numeric, absent bool, entered uuid.UUID) (any, error) {
	return r.queries.UpsertTermMark(ctx, db.UpsertTermMarkParams{StudentID: student, SubjectID: subject, TermID: term, Marks: m, MaxMarks: max, IsAbsent: absent, EnteredBy: pgtype.UUID{Bytes: entered, Valid: true}})
}
func (r *termMarkRepository) listClass(ctx context.Context, class, term, subject uuid.UUID) (any, error) {
	return r.queries.ListClassMarksForTermSubject(ctx, db.ListClassMarksForTermSubjectParams{ClassID: class, TermID: term, SubjectID: subject})
}
func (r *termMarkRepository) listStudent(ctx context.Context, student, term uuid.UUID) (any, error) {
	return r.queries.ListStudentMarksByTerm(ctx, db.ListStudentMarksByTermParams{StudentID: student, TermID: term})
}
func (r *termMarkRepository) markOwner(ctx context.Context, id uuid.UUID) (uuid.UUID, uuid.UUID, error) {
	v, e := r.queries.GetTermMarkByID(ctx, id)
	return v.StudentID, v.SubjectID, e
}
func (r *termMarkRepository) studentClass(ctx context.Context, id uuid.UUID) (uuid.UUID, error) {
	v, e := r.queries.GetStudentCurrentClass(ctx, id)
	return v.ID, e
}
func (r *termMarkRepository) authorizeClass(ctx context.Context, a TermMarkActor, class uuid.UUID) error {
	if a.Role == "admin" {
		return nil
	}
	teacher, e := r.queries.GetTeacherByUserID(ctx, a.ID)
	if e != nil {
		return errors.New("only teachers assigned to a class can view its marks")
	}
	ok, e := r.queries.IsTeacherAssignedToClass(ctx, db.IsTeacherAssignedToClassParams{ID: class, FormTeacherID: pgtype.UUID{Bytes: teacher.ID, Valid: true}, TeacherID: teacher.ID})
	if e != nil {
		return e
	}
	if !ok {
		return ErrNotAssignedToSubject
	}
	return nil
}
func (r *termMarkRepository) delete(ctx context.Context, id uuid.UUID) error {
	return r.queries.DeleteTermMark(ctx, id)
}

func newEnrollmentRepository(pool *pgxpool.Pool) *enrollmentRepository {
	return &enrollmentRepository{pool: pool, queries: db.New(pool)}
}

func NewEnrollmentRepository(pool *pgxpool.Pool) enrollmentStore {
	return newEnrollmentRepository(pool)
}
func enrollmentText(v pgtype.Text) *string {
	if !v.Valid {
		return nil
	}
	s := v.String
	return &s
}
func enrollmentUUID(v pgtype.UUID) *string {
	if !v.Valid {
		return nil
	}
	s := uuid.UUID(v.Bytes).String()
	return &s
}
func (r *enrollmentRepository) groups(ctx context.Context, id uuid.UUID) ([]enrollmentGroup, error) {
	rows, e := r.queries.ListSelectionGroupsWithSubjectIDsByLevel(ctx, id)
	if e != nil {
		return nil, e
	}
	out := make([]enrollmentGroup, len(rows))
	for i, v := range rows {
		out[i] = enrollmentGroup{ID: v.GroupID, Label: v.GroupLabel, Min: v.MinSelect, Max: v.MaxSelect, Subjects: v.SubjectIds}
	}
	return out, nil
}
func (r *enrollmentRepository) replace(ctx context.Context, student, year, level uuid.UUID, picks []EnrollmentPick) error {
	tx, e := r.pool.Begin(ctx)
	if e != nil {
		return e
	}
	defer tx.Rollback(ctx)
	q := r.queries.WithTx(tx)
	if e = q.DeleteStudentEnrollmentsForLevel(ctx, db.DeleteStudentEnrollmentsForLevelParams{StudentID: student, AcademicYearID: year, LevelID: level}); e != nil {
		return e
	}
	for _, p := range picks {
		gid, _ := uuid.Parse(p.GroupID)
		sid, _ := uuid.Parse(p.SubjectID)
		mid := pgtype.UUID{}
		if p.MediumID != "" {
			v, e := uuid.Parse(p.MediumID)
			if e != nil {
				return errors.New("invalid medium_id")
			}
			mid = pgtype.UUID{Bytes: v, Valid: true}
		}
		if _, e = q.CreateStudentSubjectEnrollment(ctx, db.CreateStudentSubjectEnrollmentParams{StudentID: student, AcademicYearID: year, GroupID: gid, SubjectID: sid, MediumID: mid}); e != nil {
			return e
		}
	}
	return tx.Commit(ctx)
}
func (r *enrollmentRepository) locked(ctx context.Context, student, level, year uuid.UUID) (bool, error) {
	return r.queries.IsStudentEnrollmentLocked(ctx, db.IsStudentEnrollmentLockedParams{StudentID: student, LevelID: level, AcademicYearID: year})
}
func (r *enrollmentRepository) lock(ctx context.Context, student, level, year uuid.UUID) error {
	return r.queries.LockStudentEnrollment(ctx, db.LockStudentEnrollmentParams{StudentID: student, LevelID: level, AcademicYearID: year})
}
func (r *enrollmentRepository) unlock(ctx context.Context, student, level, year uuid.UUID) (int64, error) {
	return r.queries.UnlockStudentEnrollment(ctx, db.UnlockStudentEnrollmentParams{StudentID: student, LevelID: level, AcademicYearID: year})
}
func (r *enrollmentRepository) remove(ctx context.Context, student, year, group, subject uuid.UUID) error {
	return r.queries.DeleteStudentSubjectEnrollment(ctx, db.DeleteStudentSubjectEnrollmentParams{StudentID: student, AcademicYearID: year, GroupID: group, SubjectID: subject})
}
func (r *enrollmentRepository) groupLevel(ctx context.Context, group uuid.UUID) (uuid.UUID, error) {
	row, err := r.queries.GetSelectionGroupByID(ctx, group)
	return row.LevelID, err
}
func mapEnrollment(v db.ListStudentEnrollmentsRow) EnrollmentResponse {
	return EnrollmentResponse{StudentID: v.StudentID.String(), AcademicYearID: v.AcademicYearID.String(), GroupID: v.GroupID.String(), GroupLabel: v.GroupLabel, LevelID: v.LevelID.String(), LevelLabel: v.LevelLabel, SubjectID: v.SubjectID.String(), SubjectName: v.SubjectName, SubjectCode: v.SubjectCode, SubjectType: enrollmentText(v.SubjectType), MediumID: enrollmentUUID(v.MediumID), MediumName: enrollmentText(v.MediumName), EnrolledAt: v.EnrolledAt.Time.String()}
}
func (r *enrollmentRepository) list(ctx context.Context, student, year uuid.UUID) ([]EnrollmentResponse, error) {
	rows, e := r.queries.ListStudentEnrollments(ctx, db.ListStudentEnrollmentsParams{StudentID: student, AcademicYearID: year})
	if e != nil {
		return nil, e
	}
	out := make([]EnrollmentResponse, len(rows))
	for i, v := range rows {
		out[i] = mapEnrollment(v)
	}
	return out, nil
}
func (r *enrollmentRepository) bySubject(ctx context.Context, subject, year uuid.UUID) ([]EnrolledStudentResponse, error) {
	rows, e := r.queries.ListStudentsBySubject(ctx, db.ListStudentsBySubjectParams{SubjectID: subject, AcademicYearID: year})
	if e != nil {
		return nil, e
	}
	out := make([]EnrolledStudentResponse, len(rows))
	for i, v := range rows {
		gid, gl := v.GroupID.String(), v.GroupLabel
		out[i] = EnrolledStudentResponse{StudentID: v.StudentID.String(), FullName: v.FullName, IndexNumber: v.IndexNumber, GroupID: &gid, GroupLabel: &gl, MediumID: enrollmentUUID(v.MediumID), MediumName: enrollmentText(v.MediumName), EnrolledAt: v.EnrolledAt.Time.String()}
	}
	return out, nil
}
func (r *enrollmentRepository) byGroup(ctx context.Context, group, year uuid.UUID) ([]EnrolledStudentResponse, error) {
	rows, e := r.queries.ListStudentsByGroup(ctx, db.ListStudentsByGroupParams{GroupID: group, AcademicYearID: year})
	if e != nil {
		return nil, e
	}
	out := make([]EnrolledStudentResponse, len(rows))
	for i, v := range rows {
		sid, sn, sc := v.SubjectID.String(), v.SubjectName, v.SubjectCode
		out[i] = EnrolledStudentResponse{StudentID: v.StudentID.String(), FullName: v.FullName, IndexNumber: v.IndexNumber, SubjectID: &sid, SubjectName: &sn, SubjectCode: &sc, MediumID: enrollmentUUID(v.MediumID), MediumName: enrollmentText(v.MediumName), EnrolledAt: v.EnrolledAt.Time.String()}
	}
	return out, nil
}
func (r *streamRepository) createStream(ctx context.Context, name string) (Stream, error) {
	row, err := r.queries.CreateStream(ctx, name)
	return mapStream(row), err
}
func (r *streamRepository) getStream(ctx context.Context, id uuid.UUID) (Stream, error) {
	row, err := r.queries.GetStreamByID(ctx, id)
	return mapStream(row), err
}
func (r *streamRepository) listStreams(ctx context.Context) ([]Stream, error) {
	rows, err := r.queries.ListStreams(ctx)
	if err != nil {
		return nil, err
	}
	result := make([]Stream, len(rows))
	for i, row := range rows {
		result[i] = mapStream(row)
	}
	return result, nil
}
func (r *streamRepository) updateStream(ctx context.Context, id uuid.UUID, name string) (Stream, error) {
	row, err := r.queries.UpdateStream(ctx, db.UpdateStreamParams{ID: id, Name: name})
	return mapStream(row), err
}
func (r *streamRepository) deleteStream(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteStream(ctx, id)
}
func (r *streamRepository) createGroup(ctx context.Context, streamID uuid.UUID, name string) (StreamGroup, error) {
	row, err := r.queries.CreateStreamGroup(ctx, db.CreateStreamGroupParams{StreamID: streamID, Name: name})
	return mapStreamGroup(row), err
}
func (r *streamRepository) getGroup(ctx context.Context, id uuid.UUID) (StreamGroup, error) {
	row, err := r.queries.GetStreamGroupByID(ctx, id)
	return mapStreamGroup(row), err
}
func (r *streamRepository) listGroups(ctx context.Context, streamID uuid.UUID) ([]StreamGroup, error) {
	rows, err := r.queries.ListStreamGroupsByStream(ctx, streamID)
	if err != nil {
		return nil, err
	}
	result := make([]StreamGroup, len(rows))
	for i, row := range rows {
		result[i] = mapStreamGroup(row)
	}
	return result, nil
}
func (r *streamRepository) updateGroup(ctx context.Context, id uuid.UUID, name string) (StreamGroup, error) {
	row, err := r.queries.UpdateStreamGroup(ctx, db.UpdateStreamGroupParams{ID: id, Name: name})
	return mapStreamGroup(row), err
}
func (r *streamRepository) deleteGroup(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteStreamGroup(ctx, id)
}
func mapStream(row db.Stream) Stream {
	return Stream{ID: row.ID, Name: row.Name, CreatedAt: row.CreatedAt.Time}
}
func mapStreamGroup(row db.StreamGroup) StreamGroup {
	return StreamGroup{ID: row.ID, StreamID: row.StreamID, Name: row.Name, CreatedAt: row.CreatedAt.Time}
}
