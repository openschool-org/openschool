package models

import "github.com/google/uuid"

type CreateClassRequest struct {
	GradeID        uuid.UUID  `json:"grade_id" binding:"required"`
	AcademicYearID uuid.UUID  `json:"academic_year_id" binding:"required"`
	Name           string     `json:"name" binding:"required"`
	FormTeacherID  *uuid.UUID `json:"form_teacher_id"`
	StreamID       *uuid.UUID `json:"stream_id"`
	StreamGroupID  *uuid.UUID `json:"stream_group_id"`
}

type UpdateClassRequest struct {
	Name          string     `json:"name" binding:"required"`
	FormTeacherID *uuid.UUID `json:"form_teacher_id"`
}

type AssignFormTeacherRequest struct {
	TeacherID uuid.UUID `json:"teacher_id" binding:"required"`
}

type AssignSubjectTeacherRequest struct {
	SubjectID uuid.UUID `json:"subject_id" binding:"required"`
	TeacherID uuid.UUID `json:"teacher_id" binding:"required"`
}

type ClassResponse struct {
	ID             uuid.UUID  `json:"id"`
	GradeID        uuid.UUID  `json:"grade_id"`
	AcademicYearID uuid.UUID  `json:"academic_year_id"`
	FormTeacherID  *uuid.UUID `json:"form_teacher_id"`
	StreamID       *uuid.UUID `json:"stream_id"`
	StreamGroupID  *uuid.UUID `json:"stream_group_id"`
	Name           string     `json:"name"`
	CreatedAt      string     `json:"created_at"`
}

type ClassWithDetailsResponse struct {
	ClassResponse
	GradeName         string `json:"grade_name"`
	AcademicYearLabel string `json:"academic_year_label"`
}

type SubjectTeacherResponse struct {
	SubjectID   uuid.UUID `json:"subject_id"`
	SubjectName string    `json:"subject_name"`
	SubjectCode string    `json:"subject_code"`
	TeacherID   uuid.UUID `json:"teacher_id"`
	TeacherName string    `json:"teacher_name"`
}
