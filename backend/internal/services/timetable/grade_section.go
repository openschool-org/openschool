package timetable

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/openschool-org/openschool/db/sqlc"
	models "github.com/openschool-org/openschool/internal/models/timetable"
	repositories "github.com/openschool-org/openschool/internal/repositories/timetable"
)

var ErrGradeSectionNotFound = errors.New("grade section not found, or still has grades assigned")

type GradeSectionService struct {
	repo         *repositories.GradeSectionRepository
	settingsRepo *repositories.TimetableSettingsRepository
}

func NewGradeSectionService(repo *repositories.GradeSectionRepository, settingsRepo *repositories.TimetableSettingsRepository) *GradeSectionService {
	return &GradeSectionService{repo: repo, settingsRepo: settingsRepo}
}

func toGradeSectionResponse(id, academicYearID uuid.UUID, name string, intervalStart, intervalEnd pgtype.Time, headTeacherID pgtype.UUID, headName *string, sortOrder int32, gradeIDs []uuid.UUID) models.GradeSectionResponse {
	resp := models.GradeSectionResponse{
		ID:                id,
		AcademicYearID:    academicYearID,
		Name:              name,
		IntervalStartTime: formatClockTime(intervalStart),
		IntervalEndTime:   formatClockTime(intervalEnd),
		SortOrder:         sortOrder,
		GradeIDs:          gradeIDs,
	}
	if headTeacherID.Valid {
		id := uuid.UUID(headTeacherID.Bytes)
		resp.SectionHeadTeacherID = &id
		resp.SectionHeadName = headName
	}
	if resp.GradeIDs == nil {
		resp.GradeIDs = []uuid.UUID{}
	}
	return resp
}

func (s *GradeSectionService) Create(ctx context.Context, req models.CreateGradeSectionRequest) (models.GradeSectionResponse, error) {
	start, err := parseClockTime(req.IntervalStartTime)
	if err != nil {
		return models.GradeSectionResponse{}, err
	}
	end, err := parseClockTime(req.IntervalEndTime)
	if err != nil {
		return models.GradeSectionResponse{}, err
	}
	if end.Microseconds <= start.Microseconds {
		return models.GradeSectionResponse{}, fmt.Errorf("interval end time must be after start time")
	}

	params := db.CreateGradeSectionParams{
		AcademicYearID:    req.AcademicYearID,
		Name:              req.Name,
		IntervalStartTime: start,
		IntervalEndTime:   end,
		SortOrder:         req.SortOrder,
	}
	if req.SectionHeadTeacherID != nil {
		params.SectionHeadTeacherID = pgtype.UUID{Bytes: *req.SectionHeadTeacherID, Valid: true}
	}

	section, err := s.repo.Create(ctx, params)
	if err != nil {
		return models.GradeSectionResponse{}, err
	}

	for _, gradeID := range req.GradeIDs {
		if err := s.repo.AssignGrade(ctx, section.ID, gradeID, req.AcademicYearID); err != nil {
			return models.GradeSectionResponse{}, err
		}
	}

	if err := s.generatePeriodsFromSettings(ctx, section); err != nil {
		return models.GradeSectionResponse{}, fmt.Errorf("section created, but could not generate periods: %w", err)
	}

	return s.Get(ctx, section.ID)
}

func (s *GradeSectionService) Get(ctx context.Context, id uuid.UUID) (models.GradeSectionResponse, error) {
	section, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return models.GradeSectionResponse{}, err
	}
	grades, err := s.repo.ListGrades(ctx, id)
	if err != nil {
		return models.GradeSectionResponse{}, err
	}
	gradeIDs := make([]uuid.UUID, len(grades))
	for i, g := range grades {
		gradeIDs[i] = g.ID
	}
	return toGradeSectionResponse(section.ID, section.AcademicYearID, section.Name, section.IntervalStartTime, section.IntervalEndTime, section.SectionHeadTeacherID, nil, section.SortOrder, gradeIDs), nil
}

func (s *GradeSectionService) ListByYear(ctx context.Context, academicYearID uuid.UUID) ([]models.GradeSectionResponse, error) {
	rows, err := s.repo.ListByYear(ctx, academicYearID)
	if err != nil {
		return nil, err
	}
	result := make([]models.GradeSectionResponse, len(rows))
	for i, row := range rows {
		grades, err := s.repo.ListGrades(ctx, row.ID)
		if err != nil {
			return nil, err
		}
		gradeIDs := make([]uuid.UUID, len(grades))
		for j, g := range grades {
			gradeIDs[j] = g.ID
		}
		var headName *string
		if row.SectionHeadName.Valid {
			headName = &row.SectionHeadName.String
		}
		result[i] = toGradeSectionResponse(row.ID, row.AcademicYearID, row.Name, row.IntervalStartTime, row.IntervalEndTime, row.SectionHeadTeacherID, headName, row.SortOrder, gradeIDs)
	}
	return result, nil
}

func (s *GradeSectionService) Update(ctx context.Context, id uuid.UUID, req models.UpdateGradeSectionRequest) (models.GradeSectionResponse, error) {
	start, err := parseClockTime(req.IntervalStartTime)
	if err != nil {
		return models.GradeSectionResponse{}, err
	}
	end, err := parseClockTime(req.IntervalEndTime)
	if err != nil {
		return models.GradeSectionResponse{}, err
	}
	if end.Microseconds <= start.Microseconds {
		return models.GradeSectionResponse{}, fmt.Errorf("interval end time must be after start time")
	}

	params := db.UpdateGradeSectionParams{
		ID:                id,
		Name:              req.Name,
		IntervalStartTime: start,
		IntervalEndTime:   end,
		SortOrder:         req.SortOrder,
	}
	if req.SectionHeadTeacherID != nil {
		params.SectionHeadTeacherID = pgtype.UUID{Bytes: *req.SectionHeadTeacherID, Valid: true}
	}
	if _, err := s.repo.Update(ctx, params); err != nil {
		return models.GradeSectionResponse{}, err
	}
	return s.Get(ctx, id)
}

func (s *GradeSectionService) Delete(ctx context.Context, id uuid.UUID) error {
	n, err := s.repo.Delete(ctx, id)
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrGradeSectionNotFound
	}
	return nil
}

func (s *GradeSectionService) AssignGrades(ctx context.Context, sectionID, academicYearID uuid.UUID, gradeIDs []uuid.UUID) error {
	for _, gradeID := range gradeIDs {
		if err := s.repo.AssignGrade(ctx, sectionID, gradeID, academicYearID); err != nil {
			return err
		}
	}
	return nil
}

func (s *GradeSectionService) RemoveGrade(ctx context.Context, sectionID, gradeID uuid.UUID) error {
	return s.repo.RemoveGrade(ctx, sectionID, gradeID)
}

// Period grid

func toPeriodResponse(p db.TimetablePeriod) models.TimetablePeriodResponse {
	resp := models.TimetablePeriodResponse{
		ID:        p.ID,
		SortOrder: p.SortOrder,
		StartTime: formatClockTime(p.StartTime),
		EndTime:   formatClockTime(p.EndTime),
		SlotType:  p.SlotType,
	}
	if p.PeriodNumber.Valid {
		n := p.PeriodNumber.Int32
		resp.PeriodNumber = &n
	}
	return resp
}

func (s *GradeSectionService) GetPeriods(ctx context.Context, sectionID uuid.UUID) ([]models.TimetablePeriodResponse, error) {
	periods, err := s.repo.ListPeriods(ctx, sectionID)
	if err != nil {
		return nil, err
	}
	result := make([]models.TimetablePeriodResponse, len(periods))
	for i, p := range periods {
		result[i] = toPeriodResponse(p)
	}
	return result, nil
}

func (s *GradeSectionService) SavePeriods(ctx context.Context, sectionID uuid.UUID, req models.SaveTimetablePeriodsRequest) ([]models.TimetablePeriodResponse, error) {
	if err := s.repo.DeletePeriods(ctx, sectionID); err != nil {
		return nil, err
	}
	for i, entry := range req.Periods {
		if entry.SlotType != "period" && entry.SlotType != "interval" {
			return nil, fmt.Errorf("slot_type must be 'period' or 'interval'")
		}
		start, err := parseClockTime(entry.StartTime)
		if err != nil {
			return nil, err
		}
		end, err := parseClockTime(entry.EndTime)
		if err != nil {
			return nil, err
		}
		params := db.CreateTimetablePeriodParams{
			GradeSectionID: sectionID,
			SortOrder:      int32(i),
			StartTime:      start,
			EndTime:        end,
			SlotType:       entry.SlotType,
		}
		if entry.SlotType == "period" {
			if entry.PeriodNumber == nil {
				return nil, fmt.Errorf("period_number is required for slot_type 'period'")
			}
			params.PeriodNumber = pgtype.Int4{Int32: *entry.PeriodNumber, Valid: true}
		}
		if _, err := s.repo.CreatePeriod(ctx, params); err != nil {
			return nil, err
		}
	}
	return s.GetPeriods(ctx, sectionID)
}

// generatePeriodsFromSettings builds a default period grid for a newly
// created grade_section from the academic year's timetable_settings
// template, inserting the section's own interval at the point the running
// clock reaches its configured interval_start_time.
func (s *GradeSectionService) generatePeriodsFromSettings(ctx context.Context, section db.GradeSection) error {
	settings, err := s.settingsRepo.GetByYear(ctx, section.AcademicYearID)
	if err != nil {
		// no settings configured yet for this year — leave the grid empty;
		// admin can configure settings and regenerate, or build it by hand.
		return nil
	}

	cursor := settings.SchoolStartTime.Microseconds
	periodDurationMicros := int64(settings.PeriodDurationMinutes) * 60 * 1_000_000
	intervalInserted := false
	sortOrder := int32(0)
	periodNum := int32(1)

	for i := int32(0); i < settings.NumberOfPeriods; {
		if !intervalInserted && cursor >= section.IntervalStartTime.Microseconds {
			if _, err := s.repo.CreatePeriod(ctx, db.CreateTimetablePeriodParams{
				GradeSectionID: section.ID,
				SortOrder:      sortOrder,
				StartTime:      section.IntervalStartTime,
				EndTime:        section.IntervalEndTime,
				SlotType:       "interval",
			}); err != nil {
				return err
			}
			sortOrder++
			cursor = section.IntervalEndTime.Microseconds
			intervalInserted = true
			continue
		}

		periodEnd := cursor + periodDurationMicros
		if _, err := s.repo.CreatePeriod(ctx, db.CreateTimetablePeriodParams{
			GradeSectionID: section.ID,
			SortOrder:      sortOrder,
			PeriodNumber:   pgtype.Int4{Int32: periodNum, Valid: true},
			StartTime:      pgtype.Time{Microseconds: cursor, Valid: true},
			EndTime:        pgtype.Time{Microseconds: periodEnd, Valid: true},
			SlotType:       "period",
		}); err != nil {
			return err
		}
		sortOrder++
		cursor = periodEnd
		periodNum++
		i++
	}

	if !intervalInserted {
		if _, err := s.repo.CreatePeriod(ctx, db.CreateTimetablePeriodParams{
			GradeSectionID: section.ID,
			SortOrder:      sortOrder,
			StartTime:      section.IntervalStartTime,
			EndTime:        section.IntervalEndTime,
			SlotType:       "interval",
		}); err != nil {
			return err
		}
	}

	return nil
}

func (s *GradeSectionService) RegeneratePeriods(ctx context.Context, sectionID uuid.UUID) ([]models.TimetablePeriodResponse, error) {
	section, err := s.repo.GetByID(ctx, sectionID)
	if err != nil {
		return nil, err
	}
	if err := s.repo.DeletePeriods(ctx, sectionID); err != nil {
		return nil, err
	}
	if err := s.generatePeriodsFromSettings(ctx, section); err != nil {
		return nil, err
	}
	return s.GetPeriods(ctx, sectionID)
}
