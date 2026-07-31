package models

import "time"

type CreateTermRequest struct {
	AcademicYearID string    `json:"academic_year_id" binding:"required"`
	Name           string    `json:"name" binding:"required"`
	StartDate      time.Time `json:"start_date" binding:"required"`
	EndDate        time.Time `json:"end_date" binding:"required"`
	SortOrder      int       `json:"sort_order"`
}

type UpdateTermRequest struct {
	Name      string    `json:"name" binding:"required"`
	StartDate time.Time `json:"start_date" binding:"required"`
	EndDate   time.Time `json:"end_date" binding:"required"`
	SortOrder int       `json:"sort_order"`
}

type TermResponse struct {
	ID             string `json:"id"`
	AcademicYearID string `json:"academic_year_id"`
	Name           string `json:"name"`
	StartDate      string `json:"start_date"`
	EndDate        string `json:"end_date"`
	IsCurrent      bool   `json:"is_current"`
	SortOrder      int    `json:"sort_order"`
	CreatedAt      string `json:"created_at"`
}
