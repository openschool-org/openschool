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

var gradeNumberRE = regexp.MustCompile(`\d+`)

func (s *PresetService) run(ctx context.Context, dryRun bool) (summary PresetSummary, err error) {
	summary = PresetSummary{DryRun: dryRun, Levels: []PresetLevelPreview{}}
	grades, err := s.store.listPresetGrades(ctx)
	if err != nil {
		return summary, fmt.Errorf("failed to list grades: %w", err)
	}
	gradeByNumber := gradesByNumber(grades)
	activePlans, requiredCodes := plansForGrades(gradeByNumber, &summary)

	existing, err := s.store.listPresetSubjects(ctx)
	if err != nil {
		return summary, fmt.Errorf("failed to list subjects: %w", err)
	}
	subjectByCode, needsCreate := plannedSubjects(existing, requiredCodes, &summary)

	err = s.store.withPresetTx(ctx, !dryRun, func(tx presetTx) error {
		r := presetRun{ctx: ctx, tx: tx, dryRun: dryRun, summary: &summary, subjectByCode: subjectByCode}
		if !dryRun {
			if err := r.createSubjects(needsCreate); err != nil {
				return err
			}
		}
		return r.applyLevels(activePlans, gradeByNumber)
	})
	return summary, err
}

// gradesByNumber maps the first number in each grade name to that grade; names without a number are skipped.
func gradesByNumber(grades []presetGrade) map[int]presetGrade {
	out := map[int]presetGrade{}
	for _, grade := range grades {
		match := gradeNumberRE.FindString(grade.Name)
		if match == "" {
			continue
		}
		if n, err := strconv.Atoi(match); err == nil {
			out[n] = grade
		}
	}
	return out
}

// plansForGrades keeps the preset levels for grades the school has, so a partial school
// does not get the whole national catalogue. It returns those plans and their subject codes.
func plansForGrades(gradeByNumber map[int]presetGrade, summary *PresetSummary) ([]presetLevel, map[string]bool) {
	allPlans := buildPresetLevels()
	active := make([]presetLevel, 0, len(allPlans))
	required := map[string]bool{}
	covered := map[int]bool{}
	skipped := map[int]bool{}
	for _, plan := range allPlans {
		if _, ok := gradeByNumber[plan.GradeNumber]; !ok {
			skipped[plan.GradeNumber] = true
			continue
		}
		covered[plan.GradeNumber] = true
		active = append(active, plan)
		for _, group := range plan.Groups {
			for _, code := range group.SubjectCodes {
				required[code] = true
			}
		}
	}
	summary.GradesSkipped = sortedKeys(skipped)
	summary.GradesCovered = sortedKeys(covered)
	return active, required
}

func sortedKeys(m map[int]bool) []int {
	var out []int
	for n := range m {
		out = append(out, n)
	}
	sort.Ints(out)
	return out
}

// plannedSubjects indexes existing subjects by code and adds a placeholder for each required one that is missing.
func plannedSubjects(existing []presetSubjectRow, required map[string]bool, summary *PresetSummary) (map[string]presetSubjectRow, map[string]bool) {
	byCode := map[string]presetSubjectRow{}
	for _, subject := range existing {
		byCode[subject.Code] = subject
	}
	needsCreate := map[string]bool{}
	for _, subject := range presetSubjects {
		if !required[subject.Code] {
			continue
		}
		if _, ok := byCode[subject.Code]; ok {
			continue
		}
		byCode[subject.Code] = presetSubjectRow{ID: uuid.New(), Code: subject.Code}
		needsCreate[subject.Code] = true
		summary.SubjectsCreated++
	}
	return byCode, needsCreate
}

// presetRun applies the preset inside one transaction; in a dry run it only counts.
type presetRun struct {
	ctx           context.Context
	tx            presetTx
	dryRun        bool
	summary       *PresetSummary
	subjectByCode map[string]presetSubjectRow
}

func (r presetRun) createSubjects(needsCreate map[string]bool) error {
	for _, subject := range presetSubjects {
		if !needsCreate[subject.Code] {
			continue
		}
		created, err := r.tx.createSubject(r.ctx, subject)
		if err != nil {
			return fmt.Errorf("failed to create subject %s: %w", subject.Code, err)
		}
		r.subjectByCode[subject.Code] = created
	}
	return nil
}

func (r presetRun) applyLevels(plans []presetLevel, gradeByNumber map[int]presetGrade) error {
	levels, err := r.tx.listLevels(r.ctx)
	if err != nil {
		return fmt.Errorf("failed to list levels: %w", err)
	}
	levelByLabel := map[string]Level{}
	for _, level := range levels {
		levelByLabel[level.Label] = level
	}
	for i, plan := range plans {
		label := fmt.Sprintf("Grade %d%s", plan.GradeNumber, plan.LabelSuffix)
		level, existed := levelByLabel[label]
		if !existed {
			if level, err = r.ensureLevel(label, gradeByNumber[plan.GradeNumber].ID, int32(i)); err != nil {
				return err
			}
			levelByLabel[label] = level
		}
		preview := PresetLevelPreview{Label: label, GradeNumber: plan.GradeNumber, AlreadyExists: existed}
		if err := r.applyGroups(level, label, plan.Groups, &preview); err != nil {
			return err
		}
		if !existed || preview.GroupsToAdd > 0 || preview.SubjectsToLink > 0 {
			r.summary.Levels = append(r.summary.Levels, preview)
		}
	}
	return nil
}

func (r presetRun) ensureLevel(label string, gradeID uuid.UUID, sortOrder int32) (Level, error) {
	r.summary.LevelsCreated++
	if r.dryRun {
		return Level{ID: uuid.New().String(), Label: label}, nil
	}
	level, err := r.tx.createLevel(r.ctx, label, gradeID, sortOrder)
	if err != nil {
		return Level{}, fmt.Errorf("failed to create level %q: %w", label, err)
	}
	return level, nil
}

func (r presetRun) applyGroups(level Level, label string, plans []presetGroup, preview *PresetLevelPreview) error {
	levelID, err := presetID(level.ID)
	if err != nil {
		return fmt.Errorf("invalid level id for %q: %w", label, err)
	}
	groups, err := r.tx.listGroups(r.ctx, levelID)
	if err != nil {
		return fmt.Errorf("failed to list groups for %q: %w", label, err)
	}
	groupByLabel := map[string]SelectionGroup{}
	for _, group := range groups {
		groupByLabel[group.Label] = group
	}
	for gi, groupPlan := range plans {
		group, found := groupByLabel[groupPlan.Label]
		if !found {
			if group, err = r.ensureGroup(levelID, label, groupPlan, int32(gi)); err != nil {
				return err
			}
			groupByLabel[groupPlan.Label] = group
			preview.GroupsToAdd++
		}
		if err := r.linkSubjects(group, groupPlan, preview); err != nil {
			return err
		}
	}
	return nil
}

func (r presetRun) ensureGroup(levelID uuid.UUID, label string, plan presetGroup, sortOrder int32) (SelectionGroup, error) {
	r.summary.GroupsCreated++
	if r.dryRun {
		return SelectionGroup{ID: uuid.New().String(), Label: plan.Label}, nil
	}
	group, err := r.tx.createGroup(r.ctx, levelID, plan, sortOrder)
	if err != nil {
		return SelectionGroup{}, fmt.Errorf("failed to create group %q on %q: %w", plan.Label, label, err)
	}
	return group, nil
}

func (r presetRun) linkSubjects(group SelectionGroup, plan presetGroup, preview *PresetLevelPreview) error {
	groupID, err := presetID(group.ID)
	if err != nil {
		return fmt.Errorf("invalid group id for %q: %w", plan.Label, err)
	}
	links, err := r.tx.listSubjects(r.ctx, groupID)
	if err != nil {
		return fmt.Errorf("failed to list subjects for group %q: %w", plan.Label, err)
	}
	linked := map[string]bool{}
	for _, link := range links {
		linked[link.SubjectCode] = true
	}
	for si, code := range plan.SubjectCodes {
		subject, found := r.subjectByCode[code]
		if linked[code] || !found {
			continue
		}
		if !r.dryRun {
			if err := r.tx.addPresetSubject(r.ctx, groupID, subject.ID, int32(si)); err != nil {
				return fmt.Errorf("failed to link %s to group %q: %w", code, plan.Label, err)
			}
		}
		r.summary.LinksCreated++
		preview.SubjectsToLink++
	}
	return nil
}
