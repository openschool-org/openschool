package models

import "time"

// GradeFrom/GradeTo bound the grades this instance runs. They drive what the
// UI offers; no backend logic infers meaning from the numbers.
type CreateSchoolRequest struct {
	Name      string `json:"name" binding:"required"`
	Address   string `json:"address"`
	Phone     string `json:"phone"`
	Email     string `json:"email"`
	LogoURL   string `json:"logo_url"`
	GradeFrom *int32 `json:"grade_from"`
	GradeTo   *int32 `json:"grade_to"`
}

type UpdateSchoolRequest struct {
	Name      string `json:"name" binding:"required"`
	Address   string `json:"address"`
	Phone     string `json:"phone"`
	Email     string `json:"email"`
	LogoURL   string `json:"logo_url"`
	GradeFrom *int32 `json:"grade_from"`
	GradeTo   *int32 `json:"grade_to"`
}

type CreateAcademicYearRequest struct {
	Label     string    `json:"label" binding:"required"`
	StartDate time.Time `json:"start_date" binding:"required"`
	EndDate   time.Time `json:"end_date" binding:"required"`
	IsCurrent bool      `json:"is_current"`
}

type SetCurrentAcademicYearRequest struct {
	AcademicYearID string `json:"academic_year_id" binding:"required"`
}

type SchoolResponse struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Address   string `json:"address"`
	Phone     string `json:"phone"`
	Email     string `json:"email"`
	LogoURL   string `json:"logo_url"`
	GradeFrom *int32 `json:"grade_from"`
	GradeTo   *int32 `json:"grade_to"`
	CreatedAt string `json:"created_at"`
}

type AcademicYearResponse struct {
	ID        string `json:"id"`
	Label     string `json:"label"`
	StartDate string `json:"start_date"`
	EndDate   string `json:"end_date"`
	IsCurrent bool   `json:"is_current"`
	CreatedAt string `json:"created_at"`
}
