package selfservice

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

// Repository is the self-service module's sqlc boundary. It maps generated
// persistence rows to stable portal payloads before returning them.
type Repository struct{ queries *db.Queries }

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{queries: db.New(pool)}
}

func (r *Repository) studentIDForUser(ctx context.Context, userID uuid.UUID) (uuid.UUID, error) {
	row, err := r.queries.GetStudentByUserID(ctx, pgtype.UUID{Bytes: userID, Valid: true})
	return row.ID, err
}

func (r *Repository) studentWithClass(ctx context.Context, studentID uuid.UUID) (StudentProfile, error) {
	row, err := r.queries.GetStudentWithClass(ctx, studentID)
	if err != nil {
		return StudentProfile{}, err
	}
	return StudentProfile{
		ID: row.ID, UserID: optionalUUID(row.UserID), FullName: row.FullName,
		NameWithInitials: row.NameWithInitials, CallingName: row.CallingName,
		IndexNumber: row.IndexNumber, Address: optionalText(row.Address), Phone: optionalText(row.Phone),
		WhatsApp: optionalText(row.Whatsapp), SpecialRemarks: optionalText(row.SpecialRemarks),
		CreatedAt: row.CreatedAt.Time, UpdatedAt: row.UpdatedAt.Time, Gender: optionalText(row.Gender),
		HouseID: optionalUUID(row.HouseID), EnrollmentStatus: row.EnrollmentStatus, Email: optionalText(row.Email),
		ClassName: optionalText(row.ClassName), GradeName: optionalText(row.GradeName),
		HouseName: optionalText(row.HouseName), AcademicYear: optionalText(row.AcademicYear),
	}, nil
}

func (r *Repository) teacherIDForUser(ctx context.Context, userID uuid.UUID) (uuid.UUID, error) {
	row, err := r.queries.GetTeacherByUserID(ctx, userID)
	return row.ID, err
}

func (r *Repository) teacherForUser(ctx context.Context, userID uuid.UUID) (TeacherProfile, error) {
	row, err := r.queries.GetTeacherByUserID(ctx, userID)
	if err != nil {
		return TeacherProfile{}, err
	}
	return TeacherProfile{
		ID: row.ID, UserID: row.UserID, FullName: row.FullName, EmployeeNumber: row.EmployeeNumber,
		NameWithInitials: row.NameWithInitials, CallingName: row.CallingName,
		JoinedDate: row.JoinedDate.Time.Format("2006-01-02"), Phone: optionalText(row.Phone), CreatedAt: row.CreatedAt.Time,
		UpdatedAt: row.UpdatedAt.Time, Title: optionalText(row.Title), Gender: optionalText(row.Gender),
		IsActive: row.IsActive, HouseID: optionalUUID(row.HouseID), EmploymentStatus: row.EmploymentStatus,
		NICNumber: row.NicNumber,
	}, nil
}

func (r *Repository) currentAcademicYearID(ctx context.Context) (uuid.UUID, error) {
	row, err := r.queries.GetCurrentAcademicYear(ctx)
	return row.ID, err
}

func optionalText(value pgtype.Text) *string {
	if !value.Valid {
		return nil
	}
	result := value.String
	return &result
}

func optionalUUID(value pgtype.UUID) *uuid.UUID {
	if !value.Valid {
		return nil
	}
	result := uuid.UUID(value.Bytes)
	return &result
}
