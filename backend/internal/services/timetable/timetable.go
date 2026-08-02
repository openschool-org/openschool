package timetable

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/openschool-org/openschool/db/sqlc"
	models "github.com/openschool-org/openschool/internal/models/timetable"
	rootrepositories "github.com/openschool-org/openschool/internal/repositories"
	repositories "github.com/openschool-org/openschool/internal/repositories/timetable"
	notificationsservices "github.com/openschool-org/openschool/internal/services/notifications"
)

var (
	ErrTimetableNotFound     = errors.New("timetable not found")
	ErrInvalidTransition     = errors.New("timetable is not in the required status for this action")
	ErrNotAuthorizedReviewer = errors.New("you are not an authorized section head for this timetable's grade")
	ErrValidationFailed      = errors.New("timetable has unresolved validation issues")
)

type TimetableService struct {
	repo             *repositories.TimetableRepository
	classRepo        *rootrepositories.ClassRepository
	gradeSectionRepo *repositories.GradeSectionRepository
	sectionHeadRepo  *rootrepositories.SectionHeadRepository
	requirementRepo  *repositories.SubjectPeriodRequirementRepository
	availabilityRepo *repositories.TeacherAvailabilityRepository
	teacherRepo      *rootrepositories.TeacherRepository
	studentRepo      *rootrepositories.StudentRepository
	guardianRepo     *rootrepositories.GuardianRepository
	notifications    *notificationsservices.NotificationService
}

func NewTimetableService(
	repo *repositories.TimetableRepository,
	classRepo *rootrepositories.ClassRepository,
	gradeSectionRepo *repositories.GradeSectionRepository,
	sectionHeadRepo *rootrepositories.SectionHeadRepository,
	requirementRepo *repositories.SubjectPeriodRequirementRepository,
	availabilityRepo *repositories.TeacherAvailabilityRepository,
	teacherRepo *rootrepositories.TeacherRepository,
	studentRepo *rootrepositories.StudentRepository,
	guardianRepo *rootrepositories.GuardianRepository,
	notifications *notificationsservices.NotificationService,
) *TimetableService {
	return &TimetableService{
		repo: repo, classRepo: classRepo, gradeSectionRepo: gradeSectionRepo, sectionHeadRepo: sectionHeadRepo,
		requirementRepo: requirementRepo, availabilityRepo: availabilityRepo, teacherRepo: teacherRepo,
		studentRepo: studentRepo, guardianRepo: guardianRepo, notifications: notifications,
	}
}

// Create / copy / revise

func (s *TimetableService) Create(ctx context.Context, req models.CreateTimetableRequest, createdBy uuid.UUID) (db.Timetable, error) {
	maxVersion, err := s.repo.GetMaxVersionForClass(ctx, req.ClassID, req.AcademicYearID)
	if err != nil {
		return db.Timetable{}, err
	}
	return s.repo.Create(ctx, db.CreateTimetableParams{
		AcademicYearID: req.AcademicYearID,
		ClassID:        req.ClassID,
		Version:        maxVersion + 1,
		CreatedBy:      createdBy,
	})
}

// CopyFrom creates a new draft for the given class/year and pre-fills it
// with another timetable's entries — used both for "copy previous year's
// timetable as a template" and for ad-hoc duplication.
func (s *TimetableService) CopyFrom(ctx context.Context, req models.CreateTimetableRequest, sourceID, createdBy uuid.UUID) (db.Timetable, error) {
	draft, err := s.Create(ctx, req, createdBy)
	if err != nil {
		return db.Timetable{}, err
	}
	if err := s.repo.CopyEntries(ctx, sourceID, draft.ID); err != nil {
		return db.Timetable{}, err
	}
	return draft, nil
}

// ReviseFromPublished starts a new draft version to replace a published
// timetable, chained via parent_timetable_id for history.
func (s *TimetableService) ReviseFromPublished(ctx context.Context, publishedID, createdBy uuid.UUID) (db.Timetable, error) {
	published, err := s.repo.GetByID(ctx, publishedID)
	if err != nil {
		return db.Timetable{}, err
	}
	if published.Status != "published" {
		return db.Timetable{}, ErrInvalidTransition
	}
	maxVersion, err := s.repo.GetMaxVersionForClass(ctx, published.ClassID, published.AcademicYearID)
	if err != nil {
		return db.Timetable{}, err
	}
	draft, err := s.repo.Create(ctx, db.CreateTimetableParams{
		AcademicYearID:    published.AcademicYearID,
		ClassID:           published.ClassID,
		Version:           maxVersion + 1,
		ParentTimetableID: pgtype.UUID{Bytes: publishedID, Valid: true},
		CreatedBy:         createdBy,
	})
	if err != nil {
		return db.Timetable{}, err
	}
	if err := s.repo.CopyEntries(ctx, publishedID, draft.ID); err != nil {
		return db.Timetable{}, err
	}
	return draft, nil
}

func (s *TimetableService) Get(ctx context.Context, id uuid.UUID) (db.Timetable, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *TimetableService) ListByClass(ctx context.Context, classID, academicYearID uuid.UUID) ([]db.ListTimetablesByClassRow, error) {
	return s.repo.ListByClass(ctx, classID, academicYearID)
}

func (s *TimetableService) ListByAcademicYear(ctx context.Context, academicYearID uuid.UUID) ([]db.ListTimetablesByAcademicYearRow, error) {
	return s.repo.ListByAcademicYear(ctx, academicYearID)
}

func (s *TimetableService) DeleteDraft(ctx context.Context, id uuid.UUID) error {
	n, err := s.repo.DeleteDraft(ctx, id)
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrTimetableNotFound
	}
	return nil
}

func (s *TimetableService) Archive(ctx context.Context, id uuid.UUID) (db.Timetable, error) {
	return s.repo.Archive(ctx, id)
}

// Entries (grid editing) — only permitted while the timetable is a draft.

func (s *TimetableService) GetEntries(ctx context.Context, timetableID uuid.UUID) ([]db.ListTimetableEntriesByTimetableRow, error) {
	return s.repo.ListEntries(ctx, timetableID)
}

func (s *TimetableService) SaveEntries(ctx context.Context, timetableID uuid.UUID, req models.SaveTimetableEntriesRequest) error {
	tt, err := s.repo.GetByID(ctx, timetableID)
	if err != nil {
		return err
	}
	if tt.Status != "draft" {
		return fmt.Errorf("timetable can only be edited while in draft status")
	}
	for _, e := range req.Entries {
		params := db.UpsertTimetableEntryParams{
			TimetableID:  timetableID,
			DayOfWeek:    e.DayOfWeek,
			PeriodNumber: e.PeriodNumber,
		}
		if e.SubjectID != nil {
			params.SubjectID = pgtype.UUID{Bytes: *e.SubjectID, Valid: true}
		}
		if e.TeacherID != nil {
			params.TeacherID = pgtype.UUID{Bytes: *e.TeacherID, Valid: true}
		}
		if e.ClassroomID != nil {
			params.ClassroomID = pgtype.UUID{Bytes: *e.ClassroomID, Valid: true}
		}
		if _, err := s.repo.UpsertEntry(ctx, params); err != nil {
			return err
		}
	}
	return nil
}

func (s *TimetableService) DeleteEntry(ctx context.Context, timetableID uuid.UUID, dayOfWeek, periodNumber int16) error {
	tt, err := s.repo.GetByID(ctx, timetableID)
	if err != nil {
		return err
	}
	if tt.Status != "draft" {
		return fmt.Errorf("timetable can only be edited while in draft status")
	}
	return s.repo.DeleteEntry(ctx, timetableID, dayOfWeek, periodNumber)
}

// Validation

func (s *TimetableService) Validate(ctx context.Context, timetableID uuid.UUID) (models.ValidationResult, error) {
	tt, err := s.repo.GetByID(ctx, timetableID)
	if err != nil {
		return models.ValidationResult{}, err
	}
	class, err := s.classRepo.GetByID(ctx, tt.ClassID)
	if err != nil {
		return models.ValidationResult{}, err
	}
	entries, err := s.repo.ListEntries(ctx, timetableID)
	if err != nil {
		return models.ValidationResult{}, err
	}
	crossBookings, err := s.repo.ListEntriesForYearExcluding(ctx, tt.AcademicYearID, timetableID)
	if err != nil {
		return models.ValidationResult{}, err
	}

	var issues []models.ValidationIssue
	addError := func(day, period int16, format string, args ...any) {
		d, p := day, period
		issues = append(issues, models.ValidationIssue{Severity: "error", Message: fmt.Sprintf(format, args...), DayOfWeek: &d, PeriodNumber: &p})
	}

	for _, e := range entries {
		if e.TeacherID.Valid {
			teacherID := uuid.UUID(e.TeacherID.Bytes)
			for _, b := range crossBookings {
				if b.TeacherID.Valid && uuid.UUID(b.TeacherID.Bytes) == teacherID && b.DayOfWeek == e.DayOfWeek && b.PeriodNumber == e.PeriodNumber {
					addError(e.DayOfWeek, e.PeriodNumber, "Teacher %s is already booked for %s at this time", teacherNameOrID(e.TeacherName, teacherID), b.ClassName)
				}
			}

			unavailable, err := s.availabilityRepo.IsUnavailable(ctx, teacherID, tt.AcademicYearID, e.DayOfWeek, e.PeriodNumber)
			if err == nil && unavailable {
				addError(e.DayOfWeek, e.PeriodNumber, "Teacher %s marked themselves unavailable at this time", teacherNameOrID(e.TeacherName, teacherID))
			}

			if e.SubjectID.Valid {
				subjectID := uuid.UUID(e.SubjectID.Bytes)
				assignedTeacherID, err := s.classRepo.GetSubjectTeacher(ctx, tt.ClassID, subjectID)
				if err == nil && assignedTeacherID != teacherID {
					addError(e.DayOfWeek, e.PeriodNumber, "%s is not the class's assigned teacher for this subject", teacherNameOrID(e.TeacherName, teacherID))
				} else if errors.Is(err, pgx.ErrNoRows) {
					assigned, err := s.repo.IsTeacherAssignedToSubject(ctx, teacherID, subjectID)
					if err == nil && !assigned {
						addError(e.DayOfWeek, e.PeriodNumber, "%s is not assigned to teach this subject", teacherNameOrID(e.TeacherName, teacherID))
					}
				}
			}
		}

		if e.ClassroomID.Valid {
			classroomID := uuid.UUID(e.ClassroomID.Bytes)
			for _, b := range crossBookings {
				if b.ClassroomID.Valid && uuid.UUID(b.ClassroomID.Bytes) == classroomID && b.DayOfWeek == e.DayOfWeek && b.PeriodNumber == e.PeriodNumber {
					addError(e.DayOfWeek, e.PeriodNumber, "Classroom is already booked by %s at this time", b.ClassName)
				}
			}
		}
	}

	requirements, err := s.requirementRepo.ListByGrade(ctx, tt.AcademicYearID, class.GradeID)
	if err == nil {
		counts, err := s.repo.CountEntriesBySubject(ctx, timetableID)
		if err == nil {
			scheduled := make(map[uuid.UUID]int32)
			for _, c := range counts {
				if c.SubjectID.Valid {
					scheduled[uuid.UUID(c.SubjectID.Bytes)] = c.EntryCount
				}
			}
			for _, req := range requirements {
				got := scheduled[req.SubjectID]
				if got < req.PeriodsPerWeek {
					issues = append(issues, models.ValidationIssue{
						Severity: "error",
						Message:  fmt.Sprintf("%s requires %d period(s)/week, only %d scheduled", req.SubjectName, req.PeriodsPerWeek, got),
					})
				}
			}
		}
	}

	reviewers, err := s.resolveAuthorizedReviewerIDs(ctx, class.GradeID, tt.AcademicYearID)
	if err != nil {
		return models.ValidationResult{}, err
	}
	if len(reviewers) == 0 {
		issues = append(issues, models.ValidationIssue{Severity: "error", Message: "No section head assigned for this grade — cannot submit for review"})
	}

	result := models.ValidationResult{Issues: issues, Valid: true}
	if result.Issues == nil {
		result.Issues = []models.ValidationIssue{}
	}
	for _, iss := range issues {
		if iss.Severity == "error" {
			result.Valid = false
			break
		}
	}
	return result, nil
}

func teacherNameOrID(name pgtype.Text, id uuid.UUID) string {
	if name.Valid {
		return name.String
	}
	return id.String()
}

// Section head resolution

func (s *TimetableService) resolveAuthorizedReviewerIDs(ctx context.Context, gradeID, academicYearID uuid.UUID) ([]uuid.UUID, error) {
	var candidates []uuid.UUID

	tic, err := s.sectionHeadRepo.GetGradeTIC(ctx, academicYearID, gradeID)
	if err == nil {
		candidates = append(candidates, tic)
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	section, err := s.gradeSectionRepo.GetForGrade(ctx, academicYearID, gradeID)
	if err == nil && section.SectionHeadTeacherID.Valid {
		candidates = append(candidates, uuid.UUID(section.SectionHeadTeacherID.Bytes))
	} else if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	return candidates, nil
}

func (s *TimetableService) isAuthorizedReviewer(ctx context.Context, gradeID, academicYearID, teacherProfileID uuid.UUID) (bool, error) {
	candidates, err := s.resolveAuthorizedReviewerIDs(ctx, gradeID, academicYearID)
	if err != nil {
		return false, err
	}
	for _, c := range candidates {
		if c == teacherProfileID {
			return true, nil
		}
	}
	return false, nil
}

// ListReviewQueueForTeacher lists timetables under review that this
// signed-in teacher is authorized to act on (as a per-grade TIC or a
// grade_sections group head).
func (s *TimetableService) ListReviewQueueForTeacher(ctx context.Context, teacherUserID, academicYearID uuid.UUID) ([]db.ListUnderReviewTimetablesForGradesRow, error) {
	teacher, err := s.teacherRepo.GetByUserID(ctx, teacherUserID)
	if err != nil {
		return []db.ListUnderReviewTimetablesForGradesRow{}, nil
	}
	ticGrades, err := s.sectionHeadRepo.ListGradeIDsHeadedByTeacher(ctx, teacher.ID, academicYearID)
	if err != nil {
		return nil, err
	}
	sectionGrades, err := s.gradeSectionRepo.ListGradeIDsForSectionHeadTeacher(ctx, teacher.ID, academicYearID)
	if err != nil {
		return nil, err
	}
	seen := make(map[uuid.UUID]bool)
	var allGrades []uuid.UUID
	for _, id := range append(ticGrades, sectionGrades...) {
		if !seen[id] {
			seen[id] = true
			allGrades = append(allGrades, id)
		}
	}
	if len(allGrades) == 0 {
		return []db.ListUnderReviewTimetablesForGradesRow{}, nil
	}
	return s.repo.ListUnderReviewForGrades(ctx, academicYearID, allGrades)
}

// Workflow transitions

func (s *TimetableService) Submit(ctx context.Context, id, submittedByUserID uuid.UUID) (db.Timetable, error) {
	tt, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return db.Timetable{}, err
	}
	if tt.Status != "draft" {
		return db.Timetable{}, ErrInvalidTransition
	}

	result, err := s.Validate(ctx, id)
	if err != nil {
		return db.Timetable{}, err
	}
	if !result.Valid {
		return db.Timetable{}, fmt.Errorf("%w (%d issue(s))", ErrValidationFailed, len(result.Issues))
	}

	updated, err := s.repo.Submit(ctx, id, submittedByUserID)
	if err != nil {
		return db.Timetable{}, err
	}

	fromStatus := "draft"
	_, _ = s.repo.AddStatusHistory(ctx, id, &fromStatus, "under_review", submittedByUserID, "")

	if class, err := s.classRepo.GetByID(ctx, tt.ClassID); err == nil {
		reviewers, _ := s.resolveAuthorizedReviewerIDs(ctx, class.GradeID, tt.AcademicYearID)
		for _, reviewerID := range reviewers {
			if teacher, err := s.teacherRepo.GetByID(ctx, reviewerID); err == nil {
				s.notifications.Notify(ctx, teacher.UserID, &id, "submitted", fmt.Sprintf("A timetable for %s is waiting for your review.", class.Name))
			}
		}
	}

	return updated, nil
}

func (s *TimetableService) Approve(ctx context.Context, id, reviewerUserID uuid.UUID, comment string) (db.Timetable, error) {
	tt, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return db.Timetable{}, err
	}
	if tt.Status != "under_review" {
		return db.Timetable{}, ErrInvalidTransition
	}
	reviewerTeacher, err := s.teacherRepo.GetByUserID(ctx, reviewerUserID)
	if err != nil {
		return db.Timetable{}, fmt.Errorf("no teacher profile linked to this account")
	}
	class, err := s.classRepo.GetByID(ctx, tt.ClassID)
	if err != nil {
		return db.Timetable{}, err
	}
	authorized, err := s.isAuthorizedReviewer(ctx, class.GradeID, tt.AcademicYearID, reviewerTeacher.ID)
	if err != nil {
		return db.Timetable{}, err
	}
	if !authorized {
		return db.Timetable{}, ErrNotAuthorizedReviewer
	}

	updated, err := s.repo.Approve(ctx, id, reviewerTeacher.ID, comment)
	if err != nil {
		return db.Timetable{}, err
	}

	fromStatus := "under_review"
	_, _ = s.repo.AddStatusHistory(ctx, id, &fromStatus, "approved", reviewerUserID, comment)
	s.notifications.Notify(ctx, tt.CreatedBy, &id, "approved", fmt.Sprintf("The timetable for %s was approved.", class.Name))

	return updated, nil
}

func (s *TimetableService) Reject(ctx context.Context, id, reviewerUserID uuid.UUID, comment string) (db.Timetable, error) {
	tt, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return db.Timetable{}, err
	}
	if tt.Status != "under_review" {
		return db.Timetable{}, ErrInvalidTransition
	}
	reviewerTeacher, err := s.teacherRepo.GetByUserID(ctx, reviewerUserID)
	if err != nil {
		return db.Timetable{}, fmt.Errorf("no teacher profile linked to this account")
	}
	class, err := s.classRepo.GetByID(ctx, tt.ClassID)
	if err != nil {
		return db.Timetable{}, err
	}
	authorized, err := s.isAuthorizedReviewer(ctx, class.GradeID, tt.AcademicYearID, reviewerTeacher.ID)
	if err != nil {
		return db.Timetable{}, err
	}
	if !authorized {
		return db.Timetable{}, ErrNotAuthorizedReviewer
	}

	updated, err := s.repo.Reject(ctx, id, reviewerTeacher.ID, comment)
	if err != nil {
		return db.Timetable{}, err
	}

	fromStatus := "under_review"
	_, _ = s.repo.AddStatusHistory(ctx, id, &fromStatus, "rejected", reviewerUserID, comment)
	s.notifications.Notify(ctx, tt.CreatedBy, &id, "rejected", fmt.Sprintf("The timetable for %s was rejected: %s", class.Name, comment))

	return updated, nil
}

func (s *TimetableService) Publish(ctx context.Context, id, publishedByUserID uuid.UUID) (db.Timetable, error) {
	tt, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return db.Timetable{}, err
	}
	if tt.Status != "approved" {
		return db.Timetable{}, ErrInvalidTransition
	}

	if err := s.repo.ArchivePublishedForClass(ctx, tt.ClassID, tt.AcademicYearID); err != nil {
		return db.Timetable{}, err
	}
	updated, err := s.repo.Publish(ctx, id, publishedByUserID)
	if err != nil {
		return db.Timetable{}, err
	}

	fromStatus := "approved"
	_, _ = s.repo.AddStatusHistory(ctx, id, &fromStatus, "published", publishedByUserID, "")

	s.notifyPublication(ctx, updated)

	return updated, nil
}

func (s *TimetableService) notifyPublication(ctx context.Context, tt db.Timetable) {
	class, err := s.classRepo.GetByID(ctx, tt.ClassID)
	if err != nil {
		return
	}
	message := fmt.Sprintf("The timetable for %s has been published.", class.Name)

	entries, _ := s.repo.ListEntries(ctx, tt.ID)
	notifiedTeachers := make(map[uuid.UUID]bool)
	for _, e := range entries {
		if !e.TeacherID.Valid {
			continue
		}
		teacherProfileID := uuid.UUID(e.TeacherID.Bytes)
		if notifiedTeachers[teacherProfileID] {
			continue
		}
		notifiedTeachers[teacherProfileID] = true
		if teacher, err := s.teacherRepo.GetByID(ctx, teacherProfileID); err == nil {
			s.notifications.Notify(ctx, teacher.UserID, &tt.ID, "published", message)
		}
	}

	students, _ := s.studentRepo.ListByClass(ctx, tt.ClassID)
	for _, student := range students {
		if student.UserID.Valid {
			s.notifications.Notify(ctx, uuid.UUID(student.UserID.Bytes), &tt.ID, "published", message)
		}
		guardians, _ := s.guardianRepo.ListByStudent(ctx, student.ID)
		for _, guardian := range guardians {
			if guardian.UserID.Valid {
				s.notifications.Notify(ctx, uuid.UUID(guardian.UserID.Bytes), &tt.ID, "published", message)
			}
		}
	}
}

// Read views for teacher / student / parent portals

func (s *TimetableService) GetTeacherSchedule(ctx context.Context, teacherUserID, academicYearID uuid.UUID) ([]db.ListTeacherScheduleForYearRow, error) {
	teacher, err := s.teacherRepo.GetByUserID(ctx, teacherUserID)
	if err != nil {
		return nil, err
	}
	return s.repo.ListTeacherScheduleForYear(ctx, teacher.ID, academicYearID)
}

func (s *TimetableService) GetPublishedForClass(ctx context.Context, classID, academicYearID uuid.UUID) (db.Timetable, []db.ListTimetableEntriesByTimetableRow, error) {
	tt, err := s.repo.GetPublishedForClass(ctx, classID, academicYearID)
	if err != nil {
		return db.Timetable{}, nil, err
	}
	entries, err := s.repo.ListEntries(ctx, tt.ID)
	if err != nil {
		return db.Timetable{}, nil, err
	}
	return tt, entries, nil
}

func (s *TimetableService) GetStudentCurrentClass(ctx context.Context, studentID uuid.UUID) (db.GetStudentCurrentClassRow, error) {
	return s.classRepo.GetStudentCurrentClass(ctx, studentID)
}

// GetPublishedForStudent resolves a student's current class and returns its
// published timetable — used by both the student's own "my timetable" view
// and the guardian's child-timetable view (after an ownership check).
func (s *TimetableService) GetPublishedForStudent(ctx context.Context, studentID uuid.UUID) (db.Timetable, []db.ListTimetableEntriesByTimetableRow, error) {
	class, err := s.classRepo.GetStudentCurrentClass(ctx, studentID)
	if err != nil {
		return db.Timetable{}, nil, err
	}
	return s.GetPublishedForClass(ctx, class.ID, class.AcademicYearID)
}

// GetPublishedForStudentUser is the same lookup starting from the
// signed-in student's own user ID (JWT "userID").
func (s *TimetableService) GetPublishedForStudentUser(ctx context.Context, studentUserID uuid.UUID) (db.Timetable, []db.ListTimetableEntriesByTimetableRow, error) {
	student, err := s.studentRepo.GetByUserID(ctx, studentUserID)
	if err != nil {
		return db.Timetable{}, nil, err
	}
	return s.GetPublishedForStudent(ctx, student.ID)
}

func (s *TimetableService) ListStatusHistory(ctx context.Context, timetableID uuid.UUID) ([]db.ListTimetableStatusHistoryRow, error) {
	return s.repo.ListStatusHistory(ctx, timetableID)
}
