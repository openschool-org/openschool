package people

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/platform/httpx"
	"github.com/openschool-org/openschool/internal/ports"
)

type studentRepository struct{ queries *db.Queries }

func NewStudentStore(pool *pgxpool.Pool) *studentRepository {
	return &studentRepository{queries: db.New(pool)}
}

func NewStudentReader(pool *pgxpool.Pool) StudentReader {
	return &studentRepository{queries: db.New(pool)}
}
func NewStudentWriter(pool *pgxpool.Pool) StudentStatusWriter {
	return &studentRepository{queries: db.New(pool)}
}

type studentAccessAuthorizer struct{ queries *db.Queries }

// NewStudentAccessAuthorizer exposes only the relationship checks required by
// middleware that protects student-scoped resources.
func NewStudentAccessAuthorizer(pool *pgxpool.Pool) ports.StudentAccessAuthorizer {
	return &studentAccessAuthorizer{queries: db.New(pool)}
}

func (r *studentAccessAuthorizer) StudentIDForUser(ctx context.Context, userID uuid.UUID) (uuid.UUID, error) {
	student, err := r.queries.GetStudentByUserID(ctx, pgtype.UUID{Bytes: userID, Valid: true})
	if err != nil {
		return uuid.Nil, err
	}
	return student.ID, nil
}

func (r *studentAccessAuthorizer) IsGuardianOfStudent(ctx context.Context, userID, studentID uuid.UUID) (bool, error) {
	return r.queries.IsGuardianOfStudent(ctx, db.IsGuardianOfStudentParams{
		UserID:    pgtype.UUID{Bytes: userID, Valid: true},
		StudentID: studentID,
	})
}
func (r *studentRepository) Get(c context.Context, id uuid.UUID) (any, error) {
	return r.queries.GetStudentByID(c, id)
}
func (r *studentRepository) GetWithClass(c context.Context, id uuid.UUID) (any, error) {
	return r.queries.GetStudentWithClass(c, id)
}

// ListPage is the paginated replacement for the old unbounded List — the
// concrete row/page types stay here since this is the one file in the
// module allowed to import db/sqlc (internal/architecture enforces this).
func (r *studentRepository) ListPage(c context.Context, p StudentListParams) (any, error) {
	params := db.ListStudentsPageParams{
		Search: nullableText(p.Search), Grade: nullableText(p.Grade), Class: nullableText(p.Class),
		Gender: nullableText(p.Gender), House: nullableText(p.House),
		PageLimit: p.Limit, PageOffset: p.Offset, SortKey: p.Sort.Key, SortDesc: p.Sort.Desc,
	}
	rows, err := r.queries.ListStudentsPage(c, params)
	if err != nil {
		return nil, err
	}
	total := int64(0)
	if len(rows) > 0 {
		total = rows[0].Total
	} else if p.Offset > 0 {
		// COUNT(*) OVER () only rides along on a returned row: an offset past
		// the last page returns zero rows and would otherwise report
		// total=0, contradicting the actual filtered count. Re-probe with
		// offset 0 to recover it.
		params.PageLimit, params.PageOffset = 1, 0
		probe, err := r.queries.ListStudentsPage(c, params)
		if err != nil {
			return nil, err
		}
		if len(probe) > 0 {
			total = probe[0].Total
		}
	}
	return httpx.Page[db.ListStudentsPageRow]{Items: rows, Total: total, Limit: p.Limit, Offset: p.Offset}, nil
}
func (r *studentRepository) ListByClass(c context.Context, id uuid.UUID) (any, error) {
	return r.queries.ListStudentsByClass(c, id)
}
func (r *studentRepository) UpdateStatus(c context.Context, id uuid.UUID, status string) (any, error) {
	return r.queries.UpdateStudentEnrollmentStatus(c, db.UpdateStudentEnrollmentStatusParams{ID: id, EnrollmentStatus: status})
}

func (r *studentRepository) FindByIndex(c context.Context, index string) error {
	_, err := r.queries.GetStudentByIndexNumber(c, index)
	return err
}
func (r *studentRepository) GetUser(c context.Context, id uuid.UUID) (studentUser, error) {
	u, err := r.queries.GetUserByID(c, id)
	return studentUser{Email: u.Email}, err
}
func (r *studentRepository) GetStudentRecord(c context.Context, id uuid.UUID) (studentRecord, error) {
	p, err := r.queries.GetStudentByID(c, id)
	return studentRecord{ID: p.ID, UserID: uuid.UUID(p.UserID.Bytes), IndexNumber: p.IndexNumber, FullName: p.FullName, Phone: p.Phone, Whatsapp: p.Whatsapp, Address: p.Address, SpecialRemark: p.SpecialRemarks, Gender: p.Gender}, err
}
func (r *studentRepository) CreateStudentUser(c context.Context, p studentUserCreate) error {
	_, err := r.queries.CreateUser(c, db.CreateUserParams{ID: p.ID, Email: p.Email, FullName: p.FullName, Role: "student", MustChangePassword: p.MustChangePassword})
	return err
}
func (r *studentRepository) CreateUser(c context.Context, p teacherUserCreate) error {
	_, err := r.queries.CreateUser(c, db.CreateUserParams{ID: p.ID, Email: p.Email, FullName: p.FullName, Role: "teacher", MustChangePassword: p.MustChangePassword})
	return err
}
func (r *studentRepository) Create(c context.Context, p studentCreate) (any, error) {
	return r.queries.CreateStudentProfile(c, db.CreateStudentProfileParams{
		UserID: pgtype.UUID{Bytes: p.UserID, Valid: true}, FullName: p.FullName, IndexNumber: p.Index,
		Address: pgtype.Text{String: p.Address, Valid: p.Address != ""}, Phone: pgtype.Text{String: p.Phone, Valid: p.Phone != ""},
		Whatsapp: pgtype.Text{String: p.WhatsApp, Valid: p.WhatsApp != ""}, SpecialRemarks: pgtype.Text{String: p.Remarks, Valid: p.Remarks != ""},
		Gender: pgtype.Text{String: p.Gender, Valid: p.Gender != ""}, HouseID: pgtype.UUID{Bytes: p.HouseID, Valid: p.HouseID != uuid.Nil},
	})
}
func (r *studentRepository) Update(c context.Context, id uuid.UUID, p studentUpdate) (any, error) {
	return r.queries.UpdateStudentProfile(c, db.UpdateStudentProfileParams{ID: id, FullName: p.FullName,
		Address: pgtype.Text{String: p.Address, Valid: p.Address != ""}, Phone: pgtype.Text{String: p.Phone, Valid: p.Phone != ""},
		Whatsapp: pgtype.Text{String: p.WhatsApp, Valid: p.WhatsApp != ""}, SpecialRemarks: pgtype.Text{String: p.Remarks, Valid: p.Remarks != ""}, Gender: pgtype.Text{String: p.Gender, Valid: p.Gender != ""}})
}
func (r *studentRepository) Delete(c context.Context, id uuid.UUID) error {
	return r.queries.DeleteStudentProfile(c, id)
}
func (r *studentRepository) DeleteUser(c context.Context, id uuid.UUID) error {
	return r.queries.DeleteUser(c, id)
}
func (r *studentRepository) AnonymizeProfile(c context.Context, id uuid.UUID) error {
	return r.queries.AnonymizeStudentProfile(c, id)
}

// EraseUser scrubs the local user row's PII and deactivates it. The email is
// replaced with a unique erased-marker (still unique-constrained) rather
// than a fixed value, since a second erasure would otherwise collide.
func (r *studentRepository) EraseUser(c context.Context, id uuid.UUID) error {
	if _, err := r.queries.UpdateUser(c, db.UpdateUserParams{
		ID: id, FullName: "Erased Student", Email: fmt.Sprintf("erased-%s@erased.invalid", id),
	}); err != nil {
		return err
	}
	_, err := r.queries.DeactivateUser(c, id)
	return err
}

func (r *studentRepository) NextEmployee(c context.Context) (string, error) {
	return r.queries.NextEmployeeNumber(c)
}
func (r *studentRepository) GetTeacher(c context.Context, id uuid.UUID) (teacherRecord, error) {
	p, err := r.queries.GetTeacherByID(c, id)
	return teacherRecord{ID: p.ID, UserID: p.UserID, EmployeeNumber: p.EmployeeNumber}, err
}
func (r *studentRepository) GetUserEmail(c context.Context, id uuid.UUID) (string, error) {
	u, err := r.queries.GetUserByID(c, id)
	return u.Email, err
}
func (r *studentRepository) CreateTeacher(c context.Context, p teacherCreate) (any, error) {
	return r.queries.CreateTeacherProfile(c, db.CreateTeacherProfileParams{UserID: p.UserID, FullName: p.FullName, EmployeeNumber: p.EmployeeNumber, NicNumber: p.NIC, JoinedDate: pgtype.Date{Time: p.JoinedDate, Valid: true}, Phone: pgtype.Text{String: p.Phone, Valid: p.Phone != ""}, Title: pgtype.Text{String: p.Title, Valid: p.Title != ""}, Gender: pgtype.Text{String: p.Gender, Valid: p.Gender != ""}, HouseID: pgtype.UUID{Bytes: p.HouseID, Valid: p.HouseID != uuid.Nil}})
}
func (r *studentRepository) UpdateTeacher(c context.Context, id uuid.UUID, p teacherUpdate) (any, error) {
	return r.queries.UpdateTeacherProfile(c, db.UpdateTeacherProfileParams{ID: id, FullName: p.FullName, Phone: pgtype.Text{String: p.Phone, Valid: p.Phone != ""}, Title: pgtype.Text{String: p.Title, Valid: p.Title != ""}, Gender: pgtype.Text{String: p.Gender, Valid: p.Gender != ""}, NicNumber: p.NIC})
}
func (r *studentRepository) UpdateTeacherStatus(c context.Context, id uuid.UUID, status string) (any, error) {
	return r.queries.UpdateTeacherEmploymentStatus(c, db.UpdateTeacherEmploymentStatusParams{ID: id, EmploymentStatus: status})
}
func (r *studentRepository) DeleteTeacher(c context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteTeacher(c, id)
}
func (r *studentRepository) AssignSubject(c context.Context, id, subject uuid.UUID) error {
	return r.queries.AssignSubjectToTeacher(c, db.AssignSubjectToTeacherParams{TeacherID: id, SubjectID: subject})
}
func (r *studentRepository) RemoveSubject(c context.Context, id, subject uuid.UUID) error {
	return r.queries.RemoveSubjectFromTeacher(c, db.RemoveSubjectFromTeacherParams{TeacherID: id, SubjectID: subject})
}
func (r *studentRepository) CountSubjects(c context.Context, id uuid.UUID) (int64, error) {
	return r.queries.CountSubjectsByTeacher(c, id)
}
func (r *studentRepository) HasWorkload(c context.Context, id uuid.UUID) (bool, error) {
	rows, err := r.queries.ListTeacherWorkload(c, id)
	return len(rows) > 0, err
}
func (r *studentRepository) SetActive(c context.Context, id uuid.UUID, active bool) error {
	return r.queries.SetTeacherActiveStatus(c, db.SetTeacherActiveStatusParams{ID: id, IsActive: active})
}

type teacherReader struct{ queries *db.Queries }

type guardianReader struct{ queries *db.Queries }

type guardianRepository struct{ queries *db.Queries }

type nonAcademicStaffRepository struct{ queries *db.Queries }

type portfolioRepository struct{ queries *db.Queries }

func NewStudentPortfolioStore(pool *pgxpool.Pool) *portfolioRepository {
	return &portfolioRepository{queries: db.New(pool)}
}
func nullableUUID(id *uuid.UUID) pgtype.UUID {
	if id == nil {
		return pgtype.UUID{}
	}
	return pgtype.UUID{Bytes: *id, Valid: true}
}
func nullableText(value string) pgtype.Text { return pgtype.Text{String: value, Valid: value != ""} }
func (r *portfolioRepository) teacherProfileID(c context.Context, user uuid.UUID) (uuid.UUID, error) {
	value, err := r.queries.GetTeacherByUserID(c, user)
	return value.ID, err
}
func (r *portfolioRepository) createProgress(c context.Context, student, term uuid.UUID, narrative string, writer *uuid.UUID) (any, error) {
	return r.queries.CreateProgressReport(c, db.CreateProgressReportParams{StudentID: student, TermID: term, Narrative: narrative, WrittenBy: nullableUUID(writer)})
}
func (r *portfolioRepository) listProgress(c context.Context, student uuid.UUID) (any, error) {
	return r.queries.ListProgressReportsByStudent(c, student)
}
func (r *portfolioRepository) updateProgress(c context.Context, id, student uuid.UUID, narrative string) (any, error) {
	return r.queries.UpdateProgressReport(c, db.UpdateProgressReportParams{ID: id, StudentID: student, Narrative: narrative})
}
func (r *portfolioRepository) deleteProgress(c context.Context, id, student uuid.UUID) (int64, error) {
	return r.queries.DeleteProgressReport(c, db.DeleteProgressReportParams{ID: id, StudentID: student})
}
func (r *portfolioRepository) createActivity(c context.Context, student, year uuid.UUID, category, name, role, achievement string) (any, error) {
	return r.queries.CreateStudentActivity(c, db.CreateStudentActivityParams{StudentID: student, AcademicYearID: year, Category: category, Name: name, Role: nullableText(role), Achievement: nullableText(achievement)})
}
func (r *portfolioRepository) listActivities(c context.Context, student uuid.UUID) (any, error) {
	return r.queries.ListStudentActivitiesByStudent(c, student)
}
func (r *portfolioRepository) updateActivity(c context.Context, id, student uuid.UUID, category, name, role, achievement string) (any, error) {
	return r.queries.UpdateStudentActivity(c, db.UpdateStudentActivityParams{ID: id, StudentID: student, Category: category, Name: name, Role: nullableText(role), Achievement: nullableText(achievement)})
}
func (r *portfolioRepository) deleteActivity(c context.Context, id, student uuid.UUID) (int64, error) {
	return r.queries.DeleteStudentActivity(c, db.DeleteStudentActivityParams{ID: id, StudentID: student})
}
func (r *portfolioRepository) createLeadership(c context.Context, student, year uuid.UUID, title, scope string) (any, error) {
	return r.queries.CreateStudentLeadershipRole(c, db.CreateStudentLeadershipRoleParams{StudentID: student, AcademicYearID: year, Title: title, Scope: nullableText(scope)})
}
func (r *portfolioRepository) listLeadership(c context.Context, student uuid.UUID) (any, error) {
	return r.queries.ListStudentLeadershipRolesByStudent(c, student)
}
func (r *portfolioRepository) deleteLeadership(c context.Context, id, student uuid.UUID) (int64, error) {
	return r.queries.DeleteStudentLeadershipRole(c, db.DeleteStudentLeadershipRoleParams{ID: id, StudentID: student})
}
func (r *portfolioRepository) createAward(c context.Context, student, year uuid.UUID, title, category string, date time.Time, description string) (any, error) {
	return r.queries.CreateStudentAward(c, db.CreateStudentAwardParams{StudentID: student, AcademicYearID: year, Title: title, Category: nullableText(category), AwardedDate: pgtype.Date{Time: date, Valid: true}, Description: nullableText(description)})
}
func (r *portfolioRepository) listAwards(c context.Context, student uuid.UUID) (any, error) {
	return r.queries.ListStudentAwardsByStudent(c, student)
}
func (r *portfolioRepository) deleteAward(c context.Context, id, student uuid.UUID) (int64, error) {
	return r.queries.DeleteStudentAward(c, db.DeleteStudentAwardParams{ID: id, StudentID: student})
}
func (r *portfolioRepository) createDiscipline(c context.Context, student, year uuid.UUID, date time.Time, description, action, severity string, recorder *uuid.UUID) (any, error) {
	return r.queries.CreateDisciplinaryRecord(c, db.CreateDisciplinaryRecordParams{StudentID: student, AcademicYearID: year, IncidentDate: pgtype.Date{Time: date, Valid: true}, Description: description, ActionTaken: nullableText(action), Severity: severity, RecordedBy: nullableUUID(recorder)})
}
func (r *portfolioRepository) listDiscipline(c context.Context, student uuid.UUID) (any, error) {
	return r.queries.ListDisciplinaryRecordsByStudent(c, student)
}
func (r *portfolioRepository) deleteDiscipline(c context.Context, id, student uuid.UUID) (int64, error) {
	return r.queries.DeleteDisciplinaryRecord(c, db.DeleteDisciplinaryRecordParams{ID: id, StudentID: student})
}

func NewNonAcademicStaffStore(pool *pgxpool.Pool) *nonAcademicStaffRepository {
	return &nonAcademicStaffRepository{queries: db.New(pool)}
}
func (r *nonAcademicStaffRepository) nextStaffEmployeeNumber(c context.Context) (string, error) {
	return r.queries.NextNonAcademicEmployeeNumber(c)
}
func (r *nonAcademicStaffRepository) createStaff(c context.Context, p staffCreate) (any, error) {
	var house pgtype.UUID
	if p.HouseID != nil {
		house = pgtype.UUID{Bytes: *p.HouseID, Valid: true}
	}
	return r.queries.CreateNonAcademicStaff(c, db.CreateNonAcademicStaffParams{FullName: p.FullName, EmployeeNumber: p.EmployeeNumber, Designation: p.Designation, Phone: pgtype.Text{String: p.Phone, Valid: p.Phone != ""}, JoinedDate: pgtype.Date{Time: p.JoinedDate, Valid: true}, Gender: pgtype.Text{String: p.Gender, Valid: p.Gender != ""}, HouseID: house})
}
func (r *nonAcademicStaffRepository) getStaff(c context.Context, id uuid.UUID) (any, error) {
	return r.queries.GetNonAcademicStaffByID(c, id)
}
func (r *nonAcademicStaffRepository) staffRecord(c context.Context, id uuid.UUID) (staffRecord, error) {
	value, err := r.queries.GetNonAcademicStaffByID(c, id)
	var house *uuid.UUID
	if value.HouseID.Valid {
		id := uuid.UUID(value.HouseID.Bytes)
		house = &id
	}
	return staffRecord{HouseID: house}, err
}
func (r *nonAcademicStaffRepository) listStaffPage(c context.Context, p StaffListParams) (any, error) {
	params := db.ListNonAcademicStaffParams{
		Search: nullableText(p.Search), Designation: nullableText(p.Designation),
		PageLimit: p.Limit, PageOffset: p.Offset, SortKey: p.Sort.Key, SortDesc: p.Sort.Desc,
	}
	rows, err := r.queries.ListNonAcademicStaff(c, params)
	if err != nil {
		return nil, err
	}
	total := int64(0)
	if len(rows) > 0 {
		total = rows[0].Total
	} else if p.Offset > 0 {
		// See studentRepository.ListPage: COUNT(*) OVER () is absent when
		// the offset lands past the last page, so it's re-probed here.
		params.PageLimit, params.PageOffset = 1, 0
		probe, err := r.queries.ListNonAcademicStaff(c, params)
		if err != nil {
			return nil, err
		}
		if len(probe) > 0 {
			total = probe[0].Total
		}
	}
	return httpx.Page[db.ListNonAcademicStaffRow]{Items: rows, Total: total, Limit: p.Limit, Offset: p.Offset}, nil
}
func (r *nonAcademicStaffRepository) updateStaff(c context.Context, id uuid.UUID, p staffUpdate) (any, error) {
	return r.queries.UpdateNonAcademicStaff(c, db.UpdateNonAcademicStaffParams{ID: id, FullName: p.FullName, Designation: p.Designation, Phone: pgtype.Text{String: p.Phone, Valid: p.Phone != ""}, Gender: pgtype.Text{String: p.Gender, Valid: p.Gender != ""}})
}
func (r *nonAcademicStaffRepository) updateStaffStatus(c context.Context, id uuid.UUID, status string) (any, error) {
	return r.queries.UpdateNonAcademicStaffEmploymentStatus(c, db.UpdateNonAcademicStaffEmploymentStatusParams{ID: id, EmploymentStatus: status})
}
func (r *nonAcademicStaffRepository) updateStaffHouse(c context.Context, id uuid.UUID, house *uuid.UUID) (any, error) {
	var value pgtype.UUID
	if house != nil {
		value = pgtype.UUID{Bytes: *house, Valid: true}
	}
	return r.queries.UpdateNonAcademicStaffHouse(c, db.UpdateNonAcademicStaffHouseParams{ID: id, HouseID: value})
}
func (r *nonAcademicStaffRepository) deleteStaff(c context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteNonAcademicStaff(c, id)
}

func NewGuardianStore(pool *pgxpool.Pool) *guardianRepository {
	return &guardianRepository{queries: db.New(pool)}
}

func (r *guardianRepository) guardian(c context.Context, id uuid.UUID) (guardianRecord, error) {
	g, err := r.queries.GetGuardianByID(c, id)
	var userID *uuid.UUID
	if g.UserID.Valid {
		id := uuid.UUID(g.UserID.Bytes)
		userID = &id
	}
	return guardianRecord{ID: g.ID, UserID: userID, FullName: g.FullName, Email: g.Email.String, Phone: g.Phone, NIC: g.NicNumber}, err
}
func (r *guardianRepository) guardianDuplicates(c context.Context, phone, email string) (any, error) {
	return r.queries.FindGuardianDuplicateCandidates(c, db.FindGuardianDuplicateCandidatesParams{Phone: phone, Email: pgtype.Text{String: email, Valid: email != ""}})
}
func (r *guardianRepository) createGuardian(c context.Context, req CreateGuardianRequest) (any, error) {
	return r.queries.CreateGuardian(c, db.CreateGuardianParams{FullName: req.FullName, Relationship: req.Relationship, Phone: req.Phone, Email: pgtype.Text{String: req.Email, Valid: req.Email != ""}, NicNumber: req.NICNumber})
}
func (r *guardianRepository) updateGuardian(c context.Context, id uuid.UUID, req UpdateGuardianRequest) (any, error) {
	return r.queries.UpdateGuardian(c, db.UpdateGuardianParams{ID: id, FullName: req.FullName, Relationship: req.Relationship, Phone: req.Phone, Email: pgtype.Text{String: req.Email, Valid: req.Email != ""}, NicNumber: req.NICNumber})
}
func (r *guardianRepository) deleteGuardian(c context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteGuardian(c, id)
}
func (r *guardianRepository) linkGuardian(c context.Context, student, guardian uuid.UUID, primary bool) error {
	return r.queries.LinkGuardianToStudent(c, db.LinkGuardianToStudentParams{StudentID: student, GuardianID: guardian, IsPrimaryContact: primary})
}
func (r *guardianRepository) unlinkGuardian(c context.Context, student, guardian uuid.UUID) error {
	return r.queries.UnlinkGuardianFromStudent(c, db.UnlinkGuardianFromStudentParams{StudentID: student, GuardianID: guardian})
}
func (r *guardianRepository) setPrimaryGuardian(c context.Context, student, guardian uuid.UUID) error {
	return r.queries.SetPrimaryContact(c, db.SetPrimaryContactParams{StudentID: student, GuardianID: guardian})
}
func (r *guardianRepository) ensureParentUser(c context.Context, id uuid.UUID, email, name string) error {
	_, err := r.queries.EnsureUserExists(c, db.EnsureUserExistsParams{ID: id, Email: email, FullName: name, Role: "parent", MustChangePassword: true})
	return err
}
func (r *guardianRepository) deleteGuardianUser(c context.Context, id uuid.UUID) error {
	return r.queries.DeleteUser(c, id)
}
func (r *guardianRepository) setGuardianUser(c context.Context, guardian, user uuid.UUID) error {
	return r.queries.SetGuardianUserID(c, db.SetGuardianUserIDParams{ID: guardian, UserID: pgtype.UUID{Bytes: user, Valid: true}})
}
func (r *guardianRepository) guardianResponse(c context.Context, id uuid.UUID) (any, error) {
	return r.queries.GetGuardianByID(c, id)
}

func NewGuardianReader(pool *pgxpool.Pool) GuardianReader {
	return &guardianReader{queries: db.New(pool)}
}
func (r *guardianReader) Get(c context.Context, id uuid.UUID) (any, error) {
	return r.queries.GetGuardianByID(c, id)
}
func (r *guardianReader) ListPage(c context.Context, p GuardianListParams) (any, error) {
	params := db.ListGuardiansParams{
		Search: nullableText(p.Search), OrphansOnly: pgtype.Bool{Bool: p.OrphansOnly, Valid: p.OrphansOnly},
		PageLimit: p.Limit, PageOffset: p.Offset, SortKey: p.Sort.Key, SortDesc: p.Sort.Desc,
	}
	rows, err := r.queries.ListGuardians(c, params)
	if err != nil {
		return nil, err
	}
	total := int64(0)
	if len(rows) > 0 {
		total = rows[0].Total
	} else if p.Offset > 0 {
		// See studentRepository.ListPage: COUNT(*) OVER () is absent when
		// the offset lands past the last page, so it's re-probed here.
		params.PageLimit, params.PageOffset = 1, 0
		probe, err := r.queries.ListGuardians(c, params)
		if err != nil {
			return nil, err
		}
		if len(probe) > 0 {
			total = probe[0].Total
		}
	}
	return httpx.Page[db.ListGuardiansRow]{Items: rows, Total: total, Limit: p.Limit, Offset: p.Offset}, nil
}
func (r *guardianReader) Students(c context.Context, id uuid.UUID) (any, error) {
	return r.queries.ListStudentsByGuardianID(c, id)
}
func (r *guardianReader) ByStudent(c context.Context, id uuid.UUID) (any, error) {
	return r.queries.ListGuardiansByStudent(c, id)
}

type guardianAccess struct{ queries *db.Queries }

func NewGuardianAccess(pool *pgxpool.Pool) ports.GuardianAccess {
	return &guardianAccess{queries: db.New(pool)}
}
func (r *guardianAccess) ChildrenForUser(c context.Context, id uuid.UUID) (any, error) {
	return r.queries.ListStudentsByGuardianUserID(c, pgtype.UUID{Bytes: id, Valid: true})
}
func (r *guardianAccess) ChildrenSummaryForUser(c context.Context, id uuid.UUID) (any, error) {
	return r.queries.GetGuardianChildrenSummary(c, pgtype.UUID{Bytes: id, Valid: true})
}
func (r *guardianAccess) IsGuardianOfStudent(c context.Context, user, student uuid.UUID) (bool, error) {
	return r.queries.IsGuardianOfStudent(c, db.IsGuardianOfStudentParams{UserID: pgtype.UUID{Bytes: user, Valid: true}, StudentID: student})
}

type guardianAuthenticator struct{ queries *db.Queries }

func NewGuardianAuthenticator(pool *pgxpool.Pool) ports.GuardianAuthenticator {
	return &guardianAuthenticator{queries: db.New(pool)}
}
func (r *guardianAuthenticator) VerifyCredentials(c context.Context, user uuid.UUID, nic string) error {
	_, err := r.queries.GetGuardianByUserIDAndNIC(c, db.GetGuardianByUserIDAndNICParams{UserID: pgtype.UUID{Bytes: user, Valid: true}, NicNumber: nic})
	return err
}

type guardianNotificationReader struct{ queries *db.Queries }

func NewGuardianNotificationReader(pool *pgxpool.Pool) GuardianNotificationReader {
	return &guardianNotificationReader{queries: db.New(pool)}
}
func (r *guardianNotificationReader) Notifications(c context.Context, guardianID uuid.UUID) (any, error) {
	g, err := r.queries.GetGuardianByID(c, guardianID)
	if err != nil {
		return nil, err
	}
	if !g.UserID.Valid {
		return []any{}, nil
	}
	rows, err := r.queries.ListMyNotifications(c, uuid.UUID(g.UserID.Bytes))
	if err != nil {
		return nil, err
	}
	out := make([]map[string]any, len(rows))
	for i, v := range rows {
		out[i] = map[string]any{"recipient_id": v.RecipientID, "notification_id": v.NotificationID, "title": v.Title, "message": v.Message, "category": v.Category, "priority": v.Priority, "sender_name": v.SenderName, "sent_at": v.SentAt, "is_read": v.IsRead, "is_archived": v.IsArchived}
	}
	return out, nil
}

func NewTeacherReader(pool *pgxpool.Pool) TeacherReader { return &teacherReader{queries: db.New(pool)} }
func (r *teacherReader) Get(c context.Context, id uuid.UUID) (any, error) {
	return r.queries.GetTeacherByID(c, id)
}
func (r *teacherReader) ListPage(c context.Context, p TeacherListParams) (any, error) {
	params := db.ListTeachersPageParams{
		Search: nullableText(p.Search), Status: nullableText(p.Status),
		PageLimit: p.Limit, PageOffset: p.Offset, SortKey: p.Sort.Key, SortDesc: p.Sort.Desc,
	}
	rows, err := r.queries.ListTeachersPage(c, params)
	if err != nil {
		return nil, err
	}
	total := int64(0)
	if len(rows) > 0 {
		total = rows[0].Total
	} else if p.Offset > 0 {
		// See studentRepository.ListPage: COUNT(*) OVER () is absent when
		// the offset lands past the last page, so it's re-probed here.
		params.PageLimit, params.PageOffset = 1, 0
		probe, err := r.queries.ListTeachersPage(c, params)
		if err != nil {
			return nil, err
		}
		if len(probe) > 0 {
			total = probe[0].Total
		}
	}
	return httpx.Page[db.ListTeachersPageRow]{Items: rows, Total: total, Limit: p.Limit, Offset: p.Offset}, nil
}
func (r *teacherReader) Subjects(c context.Context, id uuid.UUID) (any, error) {
	return r.queries.ListSubjectsByTeacher(c, id)
}
func (r *teacherReader) Workload(c context.Context, id uuid.UUID) (any, error) {
	return r.queries.ListTeacherWorkload(c, id)
}
func (r *teacherReader) BySubject(c context.Context, id uuid.UUID) (any, error) {
	return r.queries.ListTeachersBySubject(c, id)
}
