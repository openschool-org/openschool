package models

import "time"

var ValidActivityCategories = map[string]bool{
	"club":        true,
	"sport":       true,
	"society":     true,
	"competition": true,
}

var ValidDisciplinarySeverities = map[string]bool{
	"minor":  true,
	"major":  true,
	"severe": true,
}

type CreateProgressReportRequest struct {
	TermID    string `json:"term_id" binding:"required"`
	Narrative string `json:"narrative" binding:"required"`
}

type UpdateProgressReportRequest struct {
	Narrative string `json:"narrative" binding:"required"`
}

type CreateActivityRequest struct {
	AcademicYearID string `json:"academic_year_id" binding:"required"`
	Category       string `json:"category" binding:"required"`
	Name           string `json:"name" binding:"required"`
	Role           string `json:"role"`
	Achievement    string `json:"achievement"`
}

type UpdateActivityRequest struct {
	Category    string `json:"category" binding:"required"`
	Name        string `json:"name" binding:"required"`
	Role        string `json:"role"`
	Achievement string `json:"achievement"`
}

type CreateLeadershipRoleRequest struct {
	AcademicYearID string `json:"academic_year_id" binding:"required"`
	Title          string `json:"title" binding:"required"`
	Scope          string `json:"scope"`
}

type CreateAwardRequest struct {
	AcademicYearID string    `json:"academic_year_id" binding:"required"`
	Title          string    `json:"title" binding:"required"`
	Category       string    `json:"category"`
	AwardedDate    time.Time `json:"awarded_date" binding:"required"`
	Description    string    `json:"description"`
}

type CreateDisciplinaryRecordRequest struct {
	AcademicYearID string    `json:"academic_year_id" binding:"required"`
	IncidentDate   time.Time `json:"incident_date" binding:"required"`
	Description    string    `json:"description" binding:"required"`
	ActionTaken    string    `json:"action_taken"`
	Severity       string    `json:"severity" binding:"required,oneof=minor major severe"`
}
