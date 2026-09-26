package workflows

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/openschool-org/openschool/db/sqlc"
)

// ---- W4 intake ----

type MediumInfo struct {
	ID   uuid.UUID
	Name string
}

func (s *Store) mediums(ctx context.Context) ([]MediumInfo, error) {
	rows, err := s.q.WfListMediums(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]MediumInfo, len(rows))
	for i, r := range rows {
		out[i] = MediumInfo{ID: r.ID, Name: r.Name}
	}
	return out, nil
}

// schoolType returns boys, girls, mixed or "" when the school row is not set up yet.
func (s *Store) schoolType(ctx context.Context) (string, error) {
	t, err := s.q.WfSchoolType(ctx)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil
	}
	return t, err
}

func (s *Store) existingIndexNumbers(ctx context.Context, numbers []string) (map[string]bool, error) {
	rows, err := s.q.WfExistingIndexNumbers(ctx, numbers)
	if err != nil {
		return nil, err
	}
	out := make(map[string]bool, len(rows))
	for _, n := range rows {
		out[n] = true
	}
	return out, nil
}

// guardiansByNIC maps each NIC already on record to that guardian.
func (s *Store) guardiansByNIC(ctx context.Context, nics []string) (map[string]db.WfGuardiansByNICRow, error) {
	rows, err := s.q.WfGuardiansByNIC(ctx, nics)
	if err != nil {
		return nil, err
	}
	out := make(map[string]db.WfGuardiansByNICRow, len(rows))
	for _, r := range rows {
		out[r.NicNumber] = r
	}
	return out, nil
}

func optText(v string) pgtype.Text { return pgtype.Text{String: v, Valid: v != ""} }

// NewStudent is one imported student with their first guardian.
type NewStudent struct {
	Name, Index, Gender, Address, Phone string
	GuardianName, Relationship          string
	GuardianPhone, GuardianNIC          string
	GuardianEmail                       string
}

// leastUsedHouse returns nil when the school has no houses.
func (s *Store) leastUsedHouse(ctx context.Context) (pgtype.UUID, error) {
	id, err := s.q.WfLeastUsedHouse(ctx)
	if errors.Is(err, pgx.ErrNoRows) {
		return pgtype.UUID{}, nil
	}
	return pgUUID(id), err
}

func (s *Store) createIntakeStudent(ctx context.Context, st NewStudent) (uuid.UUID, error) {
	house, err := s.leastUsedHouse(ctx)
	if err != nil {
		return uuid.Nil, err
	}
	return s.q.WfCreateIntakeStudent(ctx, db.WfCreateIntakeStudentParams{FullName: st.Name, IndexNumber: st.Index, Address: optText(st.Address), Phone: optText(st.Phone), Gender: optText(st.Gender), HouseID: house})
}

func (s *Store) createGuardian(ctx context.Context, st NewStudent) (uuid.UUID, error) {
	return s.q.WfCreateGuardian(ctx, db.WfCreateGuardianParams{FullName: st.GuardianName, Relationship: st.Relationship, Phone: st.GuardianPhone, Email: optText(st.GuardianEmail), NicNumber: st.GuardianNIC})
}

func (s *Store) linkGuardian(ctx context.Context, student, guardian uuid.UUID) error {
	return s.q.WfLinkGuardian(ctx, db.WfLinkGuardianParams{StudentID: student, GuardianID: guardian})
}

func (s *Store) createIntake(ctx context.Context, in Intake) error {
	return s.q.WfCreateIntake(ctx, db.WfCreateIntakeParams{StudentID: in.StudentID, AcademicYearID: in.YearID, GradeID: in.GradeID, MediumID: optUUID(in.MediumID)})
}

func (s *Store) studentsInUse(ctx context.Context, ids []uuid.UUID) (bool, error) {
	return s.q.WfStudentsInUse(ctx, ids)
}

// deleteImported removes imported students and any guardian of theirs that is now linked to nobody.
func (s *Store) deleteImported(ctx context.Context, students, guardians []uuid.UUID) error {
	if err := s.q.WfDeleteStudents(ctx, students); err != nil {
		return err
	}
	return s.q.WfDeleteUnlinkedGuardians(ctx, guardians)
}

func (s *Store) studentsWithoutAccount(ctx context.Context, numbers []string) ([]db.WfStudentsWithoutAccountRow, error) {
	return s.q.WfStudentsWithoutAccount(ctx, numbers)
}

func (s *Store) createStudentUser(ctx context.Context, id uuid.UUID, email, name string) error {
	_, err := s.q.CreateUser(ctx, db.CreateUserParams{ID: id, Email: email, FullName: name, Role: "student", MustChangePassword: true})
	return err
}

func (s *Store) setStudentUser(ctx context.Context, student, user uuid.UUID) error {
	return s.q.WfSetStudentUser(ctx, db.WfSetStudentUserParams{ID: student, UserID: pgUUID(user)})
}

func (s *Store) deleteUser(ctx context.Context, id uuid.UUID) error {
	return s.q.DeleteUser(ctx, id)
}
