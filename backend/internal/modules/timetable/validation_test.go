package timetable

import (
	"context"
	"testing"

	"github.com/google/uuid"
)

type validationStoreStub struct {
	metadata          validationContext
	entries           []TimetableEntry
	bookings          []crossBooking
	requirementValues []requirementValue
	counts            map[uuid.UUID]int32
	reviewers         []uuid.UUID
	teacherBySub      uuid.UUID
	teacherMatch      bool
	teacherAbsent     bool
}

func (s *validationStoreStub) validationContext(context.Context, uuid.UUID) (validationContext, error) {
	return s.metadata, nil
}
func (s *validationStoreStub) validationEntries(context.Context, uuid.UUID) ([]TimetableEntry, error) {
	return s.entries, nil
}
func (s *validationStoreStub) crossBookings(context.Context, uuid.UUID, uuid.UUID) ([]crossBooking, error) {
	return s.bookings, nil
}
func (s *validationStoreStub) teacherUnavailable(context.Context, uuid.UUID, uuid.UUID, int16, int16) (bool, error) {
	return false, nil
}
func (s *validationStoreStub) classSubjectTeacher(context.Context, uuid.UUID, uuid.UUID) (uuid.UUID, error) {
	if s.teacherAbsent {
		return uuid.Nil, errNoTeacherAssignment
	}
	return s.teacherBySub, nil
}
func (s *validationStoreStub) teacherAssignedSubject(context.Context, uuid.UUID, uuid.UUID) (bool, error) {
	return s.teacherMatch, nil
}
func (s *validationStoreStub) requirements(context.Context, uuid.UUID, uuid.UUID) ([]requirementValue, error) {
	return s.requirementValues, nil
}
func (s *validationStoreStub) entrySubjectCounts(context.Context, uuid.UUID) (map[uuid.UUID]int32, error) {
	return s.counts, nil
}
func (s *validationStoreStub) blockTeachers(context.Context, uuid.UUID, uuid.UUID) ([]blockTeacher, error) {
	return nil, nil
}
func (s *validationStoreStub) authorizedReviewers(context.Context, uuid.UUID, uuid.UUID) ([]uuid.UUID, error) {
	return s.reviewers, nil
}

var errNoTeacherAssignment = testingError("no teacher assignment")

type testingError string

func (e testingError) Error() string { return string(e) }

func TestValidationFindsTeacherAndClassroomConflicts(t *testing.T) {
	teacherID, classroomID := uuid.New(), uuid.New()
	store := &validationStoreStub{
		metadata:  validationContext{AcademicYearID: uuid.New(), ClassID: uuid.New(), GradeID: uuid.New()},
		entries:   []TimetableEntry{{DayOfWeek: 1, PeriodNumber: 2, TeacherID: &teacherID, ClassroomID: &classroomID}},
		bookings:  []crossBooking{{DayOfWeek: 1, PeriodNumber: 2, TeacherID: &teacherID, ClassroomID: &classroomID, ClassName: "2-B"}},
		reviewers: []uuid.UUID{uuid.New()},
	}
	result, err := (&validationService{store: store}).validate(context.Background(), uuid.New())
	if err != nil {
		t.Fatal(err)
	}
	if result.Valid || len(result.Issues) != 2 {
		t.Fatalf("validation = %+v, want two blocking conflicts", result)
	}
}

func TestValidationReportsMissingReviewerAndRequirementShortfall(t *testing.T) {
	subjectID := uuid.New()
	store := &validationStoreStub{
		metadata:          validationContext{AcademicYearID: uuid.New(), ClassID: uuid.New(), GradeID: uuid.New()},
		requirementValues: []requirementValue{{SubjectID: subjectID, SubjectName: "Mathematics", PeriodsPerWeek: 5}},
		counts:            map[uuid.UUID]int32{subjectID: 2},
	}
	result, err := (&validationService{store: store}).validate(context.Background(), uuid.New())
	if err != nil {
		t.Fatal(err)
	}
	if result.Valid || len(result.Issues) != 2 {
		t.Fatalf("validation = %+v, want requirement and reviewer issues", result)
	}
	if result.Issues[0].Message != "Mathematics requires 5 period(s)/week, only 2 scheduled" {
		t.Fatalf("first issue = %+v", result.Issues[0])
	}
}

func TestValidationAcceptsCleanTimetable(t *testing.T) {
	store := &validationStoreStub{
		metadata:  validationContext{AcademicYearID: uuid.New(), ClassID: uuid.New(), GradeID: uuid.New()},
		reviewers: []uuid.UUID{uuid.New()},
	}
	result, err := (&validationService{store: store}).validate(context.Background(), uuid.New())
	if err != nil {
		t.Fatal(err)
	}
	if !result.Valid || len(result.Issues) != 0 {
		t.Fatalf("validation = %+v, want clean result", result)
	}
}
