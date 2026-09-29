package curriculum

import (
	"context"
	"fmt"
	"regexp"
	"sort"
	"strconv"

	"github.com/google/uuid"
)

type presetGrade struct {
	ID   uuid.UUID
	Name string
}
type presetSubjectRow struct {
	ID   uuid.UUID
	Code string
}
type presetTx interface {
	createSubject(context.Context, presetSubject) (presetSubjectRow, error)
	listLevels(context.Context) ([]Level, error)
	createLevel(context.Context, string, uuid.UUID, int32) (Level, error)
	listGroups(context.Context, uuid.UUID) ([]SelectionGroup, error)
	createGroup(context.Context, uuid.UUID, presetGroup, int32) (SelectionGroup, error)
	listSubjects(context.Context, uuid.UUID) ([]GroupSubject, error)
	addPresetSubject(context.Context, uuid.UUID, uuid.UUID, int32) error
}
type presetStore interface {
	listPresetGrades(context.Context) ([]presetGrade, error)
	listPresetSubjects(context.Context) ([]presetSubjectRow, error)
	withPresetTx(context.Context, bool, func(presetTx) error) error
}

type PresetService struct{ store presetStore }

func presetID(value string) (uuid.UUID, error) { return uuid.Parse(value) }

func NewPresetService(store presetStore) *PresetService { return &PresetService{store: store} }

func (s *PresetService) Preview(ctx context.Context) (PresetSummary, error) { return s.run(ctx, true) }
func (s *PresetService) Run(ctx context.Context) (PresetSummary, error)     { return s.run(ctx, false) }

func (s *PresetService) run(ctx context.Context, dryRun bool) (summary PresetSummary, err error) {
	summary = PresetSummary{DryRun: dryRun, Levels: []PresetLevelPreview{}}
	grades, err := s.store.listPresetGrades(ctx)
	if err != nil {
		return summary, fmt.Errorf("failed to list grades: %w", err)
	}
	gradeByNumber := map[int]presetGrade{}
	re := regexp.MustCompile(`\d+`)
	for _, grade := range grades {
		match := re.FindString(grade.Name)
		if match == "" {
			continue
		}
		n, e := strconv.Atoi(match)
		if e == nil {
			gradeByNumber[n] = grade
		}
	}

	// The school may offer only part of Grades 1-13. Build the preset plan
	// from the grades that actually exist instead of creating the complete
	// national catalogue for grades the school does not have.
	allPlans := buildPresetLevels()
	activePlans := make([]presetLevel, 0, len(allPlans))
	requiredSubjectCodes := map[string]bool{}
	covered := map[int]bool{}
	skipped := map[int]bool{}
	for _, plan := range allPlans {
		if _, ok := gradeByNumber[plan.GradeNumber]; !ok {
			skipped[plan.GradeNumber] = true
			continue
		}
		covered[plan.GradeNumber] = true
		activePlans = append(activePlans, plan)
		for _, group := range plan.Groups {
			for _, code := range group.SubjectCodes {
				requiredSubjectCodes[code] = true
			}
		}
	}
	for n := range skipped {
		summary.GradesSkipped = append(summary.GradesSkipped, n)
	}
	for n := range covered {
		summary.GradesCovered = append(summary.GradesCovered, n)
	}
	sort.Ints(summary.GradesSkipped)
	sort.Ints(summary.GradesCovered)

	existing, err := s.store.listPresetSubjects(ctx)
	if err != nil {
		return summary, fmt.Errorf("failed to list subjects: %w", err)
	}
	subjectByCode := map[string]presetSubjectRow{}
	for _, subject := range existing {
		subjectByCode[subject.Code] = subject
	}
	needsCreate := map[string]bool{}
	for _, subject := range presetSubjects {
		if !requiredSubjectCodes[subject.Code] {
			continue
		}
		if _, ok := subjectByCode[subject.Code]; ok {
			continue
		}
		subjectByCode[subject.Code] = presetSubjectRow{ID: uuid.New(), Code: subject.Code}
		needsCreate[subject.Code] = true
		summary.SubjectsCreated++
	}
	err = s.store.withPresetTx(ctx, !dryRun, func(tx presetTx) error {
		if !dryRun {
			for _, subject := range presetSubjects {
				if !needsCreate[subject.Code] {
					continue
				}
				created, e := tx.createSubject(ctx, subject)
				if e != nil {
					return fmt.Errorf("failed to create subject %s: %w", subject.Code, e)
				}
				subjectByCode[subject.Code] = created
				needsCreate[subject.Code] = false
			}
		}
		levels, e := tx.listLevels(ctx)
		if e != nil {
			return fmt.Errorf("failed to list levels: %w", e)
		}
		levelByLabel := map[string]Level{}
		for _, level := range levels {
			levelByLabel[level.Label] = level
		}
		sortOrder := int32(0)
		for _, plan := range activePlans {
			grade := gradeByNumber[plan.GradeNumber]
			label := fmt.Sprintf("Grade %d%s", plan.GradeNumber, plan.LabelSuffix)
			level, existed := levelByLabel[label]
			if !existed {
				if dryRun {
					level = Level{ID: uuid.New().String(), Label: label}
				} else {
					level, e = tx.createLevel(ctx, label, grade.ID, sortOrder)
					if e != nil {
						return fmt.Errorf("failed to create level %q: %w", label, e)
					}
				}
				levelByLabel[label] = level
				summary.LevelsCreated++
			}
			sortOrder++
			preview := PresetLevelPreview{Label: label, GradeNumber: plan.GradeNumber, AlreadyExists: existed}
			levelID, e := presetID(level.ID)
			if e != nil {
				return fmt.Errorf("invalid level id for %q: %w", label, e)
			}
			groups, e := tx.listGroups(ctx, levelID)
			if e != nil {
				return fmt.Errorf("failed to list groups for %q: %w", label, e)
			}
			groupByLabel := map[string]SelectionGroup{}
			for _, group := range groups {
				groupByLabel[group.Label] = group
			}
			for gi, groupPlan := range plan.Groups {
				group, found := groupByLabel[groupPlan.Label]
				if !found {
					if dryRun {
						group = SelectionGroup{ID: uuid.New().String(), Label: groupPlan.Label}
					} else {
						group, e = tx.createGroup(ctx, levelID, groupPlan, int32(gi))
						if e != nil {
							return fmt.Errorf("failed to create group %q on %q: %w", groupPlan.Label, label, e)
						}
					}
					groupByLabel[groupPlan.Label] = group
					summary.GroupsCreated++
					preview.GroupsToAdd++
				}
				groupID, e := presetID(group.ID)
				if e != nil {
					return fmt.Errorf("invalid group id for %q: %w", groupPlan.Label, e)
				}
				links, e := tx.listSubjects(ctx, groupID)
				if e != nil {
					return fmt.Errorf("failed to list subjects for group %q: %w", groupPlan.Label, e)
				}
				linked := map[string]bool{}
				for _, link := range links {
					linked[link.SubjectCode] = true
				}
				for si, code := range groupPlan.SubjectCodes {
					if linked[code] {
						continue
					}
					subject, found := subjectByCode[code]
					if !found {
						continue
					}
					if !dryRun {
						if e = tx.addPresetSubject(ctx, groupID, subject.ID, int32(si)); e != nil {
							return fmt.Errorf("failed to link %s to group %q: %w", code, groupPlan.Label, e)
						}
					}
					summary.LinksCreated++
					preview.SubjectsToLink++
				}
			}
			if !existed || preview.GroupsToAdd > 0 || preview.SubjectsToLink > 0 {
				summary.Levels = append(summary.Levels, preview)
			}
		}
		return nil
	})
	return summary, err
}
