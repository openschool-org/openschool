package models

import "github.com/google/uuid"

type CreateClassRequest struct {
	GradeID        uuid.UUID  `json:"grade_id" binding:"required"`
	AcademicYearID uuid.UUID  `json:"academic_year_id" binding:"required"`
	Name           string     `json:"name" binding:"required"`
	FormTeacherID  *uuid.UUID `json:"form_teacher_id"`
	StreamID       *uuid.UUID `json:"stream_id"`
	StreamGroupID  *uuid.UUID `json:"stream_group_id"`
	// language of instruction; nil leaves the class undesignated, which keeps
	// it inside the promotion shuffle pool.
	MediumID *uuid.UUID `json:"medium_id"`
	// the class's fixed homeroom — students stay here all day, teachers
	// rotate in (Sri Lankan model); nil leaves it unset.
	HomeClassroomID *uuid.UUID `json:"home_classroom_id"`
}

type UpdateClassRequest struct {
	Name            string     `json:"name" binding:"required"`
	FormTeacherID   *uuid.UUID `json:"form_teacher_id"`
	MediumID        *uuid.UUID `json:"medium_id"`
	HomeClassroomID *uuid.UUID `json:"home_classroom_id"`
}

type AssignFormTeacherRequest struct {
	TeacherID uuid.UUID `json:"teacher_id" binding:"required"`
}

// AssignClassMonitorsRequest sets both monitor slots at once; omit or send
// null for a slot to clear it.
type AssignClassMonitorsRequest struct {
	GirlMonitorID *uuid.UUID `json:"girl_monitor_id"`
	BoyMonitorID  *uuid.UUID `json:"boy_monitor_id"`
}

type AssignSubjectTeacherRequest struct {
	SubjectID uuid.UUID `json:"subject_id" binding:"required"`
	TeacherID uuid.UUID `json:"teacher_id" binding:"required"`
}

type ClassResponse struct {
	ID              uuid.UUID  `json:"id"`
	GradeID         uuid.UUID  `json:"grade_id"`
	AcademicYearID  uuid.UUID  `json:"academic_year_id"`
	FormTeacherID   *uuid.UUID `json:"form_teacher_id"`
	StreamID        *uuid.UUID `json:"stream_id"`
	StreamGroupID   *uuid.UUID `json:"stream_group_id"`
	GirlMonitorID   *uuid.UUID `json:"girl_monitor_id"`
	BoyMonitorID    *uuid.UUID `json:"boy_monitor_id"`
	MediumID        *uuid.UUID `json:"medium_id"`
	HomeClassroomID *uuid.UUID `json:"home_classroom_id"`
	Name            string     `json:"name"`
	CreatedAt       string     `json:"created_at"`
}

type ClassWithDetailsResponse struct {
	ClassResponse
	GradeName         string  `json:"grade_name"`
	AcademicYearLabel string  `json:"academic_year_label"`
	MediumName        *string `json:"medium_name"`
	HomeClassroomName *string `json:"home_classroom_name"`
}

type SubjectTeacherResponse struct {
	SubjectID   uuid.UUID `json:"subject_id"`
	SubjectName string    `json:"subject_name"`
	SubjectCode string    `json:"subject_code"`
	TeacherID   uuid.UUID `json:"teacher_id"`
	TeacherName string    `json:"teacher_name"`
}
