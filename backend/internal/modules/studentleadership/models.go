package studentleadership

import (
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type Prefect struct {
	ID             uuid.UUID          `json:"id"`
	AcademicYearID uuid.UUID          `json:"academic_year_id"`
	StudentID      uuid.UUID          `json:"student_id"`
	Rank           string             `json:"rank"`
	CreatedAt      pgtype.Timestamptz `json:"created_at"`
}

type PrefectListItem struct {
	Prefect
	StudentName  string      `json:"student_name"`
	StudentIndex string      `json:"student_index"`
	GradeName    pgtype.Text `json:"grade_name"`
}

type PrefectAppointment struct {
	ID                uuid.UUID          `json:"id"`
	AcademicYearID    uuid.UUID          `json:"academic_year_id"`
	Rank              string             `json:"rank"`
	CreatedAt         pgtype.Timestamptz `json:"created_at"`
	AcademicYearLabel string             `json:"academic_year_label"`
}

type AcademicYearOption struct {
	ID        uuid.UUID   `json:"id"`
	Label     string      `json:"label"`
	StartDate pgtype.Date `json:"start_date"`
}

type Society struct {
	ID                uuid.UUID          `json:"id"`
	Name              string             `json:"name"`
	TeacherInChargeID uuid.UUID          `json:"teacher_in_charge_id"`
	AcademicYearID    uuid.UUID          `json:"academic_year_id"`
	CreatedAt         pgtype.Timestamptz `json:"created_at"`
}

type SocietyListItem struct {
	Society
	TeacherName string `json:"teacher_name"`
	MemberCount int64  `json:"member_count"`
}

type SocietyMember struct {
	ID             uuid.UUID          `json:"id"`
	SocietyID      uuid.UUID          `json:"society_id"`
	StudentID      uuid.UUID          `json:"student_id"`
	Role           string             `json:"role"`
	AcademicYearID uuid.UUID          `json:"academic_year_id"`
	CreatedAt      pgtype.Timestamptz `json:"created_at"`
	// LeftAt is set once the member is deactivated; the row stays as history.
	LeftAt     pgtype.Timestamptz `json:"left_at"`
	LeftReason pgtype.Text        `json:"left_reason"`
}

type SocietyMemberListItem struct {
	SocietyMember
	StudentName  string      `json:"student_name"`
	StudentIndex string      `json:"student_index"`
	GradeName    pgtype.Text `json:"grade_name"`
}

type SocietyMembership struct {
	ID                uuid.UUID          `json:"id"`
	SocietyID         uuid.UUID          `json:"society_id"`
	Role              string             `json:"role"`
	AcademicYearID    uuid.UUID          `json:"academic_year_id"`
	CreatedAt         pgtype.Timestamptz `json:"created_at"`
	LeftAt            pgtype.Timestamptz `json:"left_at"`
	SocietyName       string             `json:"society_name"`
	AcademicYearLabel string             `json:"academic_year_label"`
}
