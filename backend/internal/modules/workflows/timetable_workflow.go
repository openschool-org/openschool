package workflows

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"strings"

	"github.com/google/uuid"
	timetablemodule "github.com/openschool-org/openschool/internal/modules/timetable"
)

// Timetable (W7) checks the timetable setup, plans option blocks from the subject choices (basket
// and A/L option subjects at the same period across the classes that share them), and generates
// draft timetables for whole grade sections with the existing generator and its repair pass. The
// proposal is a real dry run: the generation runs in a transaction that is rolled back.
type Timetable struct{}

func (Timetable) Key() string   { return "timetable" }
func (Timetable) Title() string { return "Timetable" }
func (Timetable) Description() string {
	return "Checks the timetable setup, runs basket and A/L option subjects as option blocks at the same period across classes, and generates draft timetables for whole grade sections. The drafts then go to section-head review as usual."
}

var (
	ToolCheckTimetableSetup = tool("check_timetable_setup", "Checks period grids, subject hours, subject teachers, lab rooms, section heads and teacher availability for the year.", false)
	ToolPlanOptionBlocks    = tool("plan_option_blocks", "Turns each one-pick subject group into an option block covering the classes whose students chose from it.", false)
	ToolPreviewTimetables   = tool("preview_timetables", "Runs the generator in a transaction that is rolled back, to show what each class would get.", false)
	ToolSaveOptionBlocks    = tool("save_option_blocks", "Replaces the option blocks of the chosen grades for the year.", true)
	ToolGenerateTimetables  = tool("generate_timetables", "Generates draft timetables per grade section: option blocks first, then lessons, then a repair pass that moves a lesson to close a gap.", true)
)

func (Timetable) Steps() []StepInfo {
	return []StepInfo{
		{Key: "check_setup", Title: "Check the timetable setup", Tool: ToolCheckTimetableSetup, Phase: "propose"},
		{Key: "plan_blocks", Title: "Plan option blocks", Tool: ToolPlanOptionBlocks, Phase: "propose"},
		{Key: "preview", Title: "Preview the timetables", Tool: ToolPreviewTimetables, Phase: "propose"},
		{Key: "save_blocks", Title: "Save option blocks", Tool: ToolSaveOptionBlocks, Phase: "apply"},
		{Key: "generate", Title: "Generate draft timetables", Tool: ToolGenerateTimetables, Phase: "apply"},
	}
}

func defaultTargetYear(years []Year) *Year {
	cur := currentYear(years)
	if cur == nil {
		return nil
	}
	for i := range years {
		if !years[i].Current && years[i].Start.After(cur.Start) {
			return &years[i]
		}
	}
	return cur
}

func (Timetable) Inputs(ctx context.Context, s *Store) ([]InputField, error) {
	years, err := s.years(ctx)
	if err != nil {
		return nil, err
	}
	var sectionOptions []Option
	var defaults []string
	target := defaultTargetYear(years)
	for _, y := range years {
		secs, err := s.sections(ctx, y)
		if err != nil {
			return nil, err
		}
		for _, sec := range secs {
			sectionOptions = append(sectionOptions, Option{Value: sec.ID.String(), Label: y.Label + ": " + sec.Name})
			if target != nil && y.ID == target.ID {
				defaults = append(defaults, sec.ID.String())
			}
		}
	}
	fields := []InputField{
		{Key: "target_year", Label: "Timetable year", Type: "select", Required: true, Options: yearOptions(years)},
		{Key: "sections", Label: "Grade sections", Type: "multiselect", Required: true, Options: sectionOptions, Default: strings.Join(defaults, ","), Help: "Classes whose timetable is already submitted or published are left alone."},
		{Key: "blocks", Label: "Run basket and A/L option subjects as option blocks", Type: "boolean", Default: "true", Help: "Needs subject choices recorded for next year."},
	}
	if target != nil {
		fields[0].Default = target.ID.String()
	}
	return fields, nil
}

// timetableScope resolves the chosen year and the sections of that year among the chosen ones.
func (Timetable) scope(ctx context.Context, s *Store, in Inputs) (*Year, []SectionInfo, error) {
	id, ok := parseID(in["target_year"])
	if !ok {
		return nil, nil, nil
	}
	year, err := s.year(ctx, id)
	if err != nil {
		return nil, nil, nil
	}
	all, err := s.sections(ctx, year)
	if err != nil {
		return nil, nil, err
	}
	chosen := map[uuid.UUID]bool{}
	for _, sid := range parseIDs(in["sections"]) {
		chosen[sid] = true
	}
	var out []SectionInfo
	for _, sec := range all {
		if chosen[sec.ID] {
			out = append(out, sec)
		}
	}
	return &year, out, nil
}

func (w Timetable) Check(ctx context.Context, s *Store, in Inputs) ([]Check, error) {
	year, sections, err := w.scope(ctx, s, in)
	if err != nil {
		return nil, err
	}
	checks := []Check{
		{Key: "year", Title: "A year is chosen", OK: year != nil, Blocking: true},
		{Key: "sections", Title: "At least one grade section of that year is chosen", OK: len(sections) > 0, Blocking: true, FixPath: "/grade-sections"},
	}
	if year == nil || len(sections) == 0 {
		return checks, nil
	}
	var noGrid, noHead []string
	chosen := map[uuid.UUID]bool{}
	for _, sec := range sections {
		chosen[sec.ID] = true
		if sec.Periods == 0 {
			noGrid = append(noGrid, sec.Name)
		}
		if !sec.HasHead {
			noHead = append(noHead, sec.Name)
		}
	}
	classes, err := s.sectionClasses(ctx, year.ID)
	if err != nil {
		return nil, err
	}
	hours, err := s.subjectHours(ctx, year.ID)
	if err != nil {
		return nil, err
	}
	assigned, err := s.yearSubjectTeachers(ctx, year.ID)
	if err != nil {
		return nil, err
	}
	labs, err := s.subjectsMissingLabs(ctx, year.ID)
	if err != nil {
		return nil, err
	}
	withAvailability, err := s.teachersWithAvailability(ctx, year.ID)
	if err != nil {
		return nil, err
	}
	hoursByGrade := map[uuid.UUID]int{}
	for _, h := range hours {
		hoursByGrade[h.GradeID]++
	}
	has := map[[2]uuid.UUID]bool{}
	for _, a := range assigned {
		has[[2]uuid.UUID{a.ClassID, a.SubjectID}] = true
	}
	inScope, missingTeacher := 0, 0
	gradesWithout := map[string]bool{}
	for _, c := range classes {
		if !chosen[c.SectionID] {
			continue
		}
		inScope++
		if hoursByGrade[c.GradeID] == 0 {
			gradesWithout[c.GradeName] = true
		}
		for _, h := range hours {
			if h.GradeID == c.GradeID && !has[[2]uuid.UUID{c.ClassID, h.SubjectID}] {
				missingTeacher++
			}
		}
	}
	var gradeNames []string
	for g := range gradesWithout {
		gradeNames = append(gradeNames, g)
	}
	sort.Strings(gradeNames)
	checks = append(checks,
		Check{Key: "grids", Title: "Every section has a period grid", OK: len(noGrid) == 0, Blocking: true, FixPath: "/grade-sections", Detail: listDetail("Missing for", noGrid)},
		Check{Key: "classes", Title: "The sections have classes", OK: inScope > 0, Blocking: true, FixPath: "/year-end/year_rollover", Detail: plural(inScope, "class", "classes")},
		Check{Key: "hours", Title: "Every grade has subject hours", OK: len(gradeNames) == 0, Blocking: len(gradeNames) > 0 && len(gradeNames) == len(gradesInScope(classes, chosen)), FixPath: "/subject-requirements", Detail: listDetail("Missing for", gradeNames)},
		Check{Key: "teachers", Title: "Every class subject has a teacher", OK: missingTeacher == 0, FixPath: "/year-end/teacher_allocation",
			Detail: fmt.Sprintf("%s have no teacher; the form teacher is used where set, otherwise they are left as gaps.", plural(missingTeacher, "class subject", "class subjects"))},
		Check{Key: "labs", Title: "Subjects with lab periods have a lab room", OK: len(labs) == 0, FixPath: "/classrooms", Detail: listDetail("No lab for", labs)},
		Check{Key: "heads", Title: "Every section has a section head to review", OK: len(noHead) == 0, FixPath: "/grade-sections", Detail: listDetail("No section head for", noHead) + " Drafts cannot be submitted for review without one, unless the grade has a teacher in charge."},
		Check{Key: "availability", Title: "Teacher availability is entered", OK: withAvailability > 0, FixPath: "/teachers", Detail: "Optional. Without it every teacher is treated as free all week."},
	)
	return checks, nil
}

func gradesInScope(classes []SectionClass, chosen map[uuid.UUID]bool) map[uuid.UUID]bool {
	out := map[uuid.UUID]bool{}
	for _, c := range classes {
		if chosen[c.SectionID] {
			out[c.GradeID] = true
		}
	}
	return out
}

func listDetail(prefix string, items []string) string {
	if len(items) == 0 {
		return ""
	}
	return prefix + " " + strings.Join(items, ", ") + "."
}

// planBlocks makes one block per one-pick subject group of each grade in scope, covering the
// classes whose students chose from it. Groups where a student picks several subjects cannot
// share one period and are reported instead.
func (Timetable) planBlocks(ctx context.Context, s *Store, year uuid.UUID, classes []SectionClass, grades map[uuid.UUID]bool) ([]Row, []string, error) {
	levels, err := s.gradeLevels(ctx)
	if err != nil {
		return nil, nil, err
	}
	hours, err := s.subjectHours(ctx, year)
	if err != nil {
		return nil, nil, err
	}
	periods := map[[2]uuid.UUID]int{}
	for _, h := range hours {
		periods[[2]uuid.UUID{h.GradeID, h.SubjectID}] = h.Periods
	}
	className := map[uuid.UUID]SectionClass{}
	for _, c := range classes {
		className[c.ClassID] = c
	}
	var rows []Row
	var notes []string
	for _, l := range levels {
		if !grades[l.GradeID] {
			continue
		}
		groups, err := s.levelGroups(ctx, l.ID)
		if err != nil {
			return nil, nil, err
		}
		for _, g := range groups {
			if g.Fixed() {
				continue
			}
			if g.Max > 1 {
				notes = append(notes, fmt.Sprintf("%s %s: students pick %d subjects, so it cannot run as one option block; its subjects are timetabled as ordinary lessons.", l.GradeName, g.Label, g.Max))
				continue
			}
			ids, err := s.groupClasses(ctx, year, g.ID)
			if err != nil {
				return nil, nil, err
			}
			var cls []SectionClass
			for _, id := range ids {
				if c, ok := className[id]; ok && c.GradeID == l.GradeID {
					cls = append(cls, c)
				}
			}
			if len(cls) == 0 {
				continue
			}
			sort.Slice(cls, func(i, j int) bool { return naturalLess(cls[i].ClassName, cls[j].ClassName) })
			most := 0
			var subjectIDs, subjectNames, classIDs, classNames []string
			for _, o := range g.Subjects {
				sid, _ := parseID(o.Value)
				if p := periods[[2]uuid.UUID{l.GradeID, sid}]; p > 0 {
					subjectIDs = append(subjectIDs, o.Value)
					subjectNames = append(subjectNames, o.Label)
					if p > most {
						most = p
					}
				}
			}
			if most == 0 {
				notes = append(notes, fmt.Sprintf("%s %s: none of its subjects has subject hours, so no block was planned.", l.GradeName, g.Label))
				continue
			}
			for _, c := range cls {
				classIDs = append(classIDs, c.ClassID.String())
				classNames = append(classNames, c.ClassName)
			}
			name := g.Label
			if len(levels) > 1 && !strings.Contains(strings.ToLower(g.Label), strings.ToLower(l.Label)) {
				name = l.Label + " " + g.Label
			}
			rows = append(rows, Row{ID: "block:" + l.GradeID.String() + ":" + g.ID.String(), Group: l.GradeName,
				Reason: fmt.Sprintf("Students in these classes chose from %s; the block takes the most hours of its subjects.", g.Label),
				Cells: map[string]string{"grade": l.GradeName, "name": name, "subjects": strings.Join(subjectNames, ", "), "classes": strings.Join(classNames, ", "),
					"periods": strconv.Itoa(most), "create": "true", "grade_id": l.GradeID.String(), "subject_ids": strings.Join(subjectIDs, ","), "class_ids": strings.Join(classIDs, ",")}})
		}
	}
	return rows, notes, nil
}

// build saves the ticked blocks (replacing the grades' old ones) and generates every chosen section.
func (w Timetable) build(ctx context.Context, tx *Store, year Year, sections []SectionInfo, blockRows []Row, useBlocks bool, actor uuid.UUID) (timetableSnapshot, []timetablemodule.ClassGenerationResult, error) {
	snap := timetableSnapshot{Year: year.ID}
	classes, err := tx.sectionClasses(ctx, year.ID)
	if err != nil {
		return snap, nil, err
	}
	grades := gradesInScope(classes, sectionSet(sections))
	existing, err := tx.optionBlocksForYear(ctx, year.ID)
	if err != nil {
		return snap, nil, err
	}
	if useBlocks {
		var old []uuid.UUID
		for _, b := range existing {
			if grades[b.GradeID] {
				old = append(old, b.ID)
				snap.PreviousBlocks = append(snap.PreviousBlocks, b)
			}
		}
		if used, err := tx.optionBlocksInSubmittedTimetables(ctx, old); err != nil {
			return snap, nil, err
		} else if used {
			return snap, nil, fmt.Errorf("%w: a submitted or published timetable uses these grades' current option blocks; revise it first, or untick option blocks", ErrInvalidProposal)
		}
		if err := tx.deleteOptionBlocks(ctx, old); err != nil {
			return snap, nil, err
		}
		for _, r := range blockRows {
			if r.Cells["create"] != "true" {
				continue
			}
			grade, _ := parseID(r.Cells["grade_id"])
			periods, _ := strconv.Atoi(r.Cells["periods"])
			def := BlockDef{GradeID: grade, Name: r.Cells["name"], Periods: int32(periods), Subjects: parseIDs(r.Cells["subject_ids"]), Classes: parseIDs(r.Cells["class_ids"])}
			id, err := tx.createOptionBlock(ctx, year.ID, def)
			if err != nil {
				return snap, nil, fmt.Errorf("block %s: %w", def.Name, err)
			}
			snap.CreatedBlocks = append(snap.CreatedBlocks, id)
		}
	}
	var results []timetablemodule.ClassGenerationResult
	for _, sec := range sections {
		res, err := tx.generateSection(ctx, year.ID, sec.ID, actor)
		if err != nil {
			return snap, nil, fmt.Errorf("section %s: %w", sec.Name, err)
		}
		for _, c := range res.Classes {
			if c.TimetableID != nil {
				snap.Timetables = append(snap.Timetables, *c.TimetableID)
			}
		}
		results = append(results, res.Classes...)
	}
	return snap, results, nil
}

func sectionSet(sections []SectionInfo) map[uuid.UUID]bool {
	out := map[uuid.UUID]bool{}
	for _, s := range sections {
		out[s.ID] = true
	}
	return out
}

type timetableSnapshot struct {
	Year           uuid.UUID   `json:"year"`
	Timetables     []uuid.UUID `json:"timetables"`
	CreatedBlocks  []uuid.UUID `json:"created_blocks"`
	PreviousBlocks []BlockDef  `json:"previous_blocks"`
}

func (w Timetable) Propose(ctx context.Context, s *Store, in Inputs, trace *Trace) (Proposal, string, error) {
	year, sections, err := w.scope(ctx, s, in)
	if err != nil {
		return Proposal{}, "", err
	}
	var classes []SectionClass
	var status map[uuid.UUID]string
	if err := trace.Run(stepByKey(w, "check_setup"), func() (string, error) {
		var err error
		if classes, err = s.sectionClasses(ctx, year.ID); err != nil {
			return "", err
		}
		status, err = s.latestTimetableStatus(ctx, year.ID)
		return fmt.Sprintf("%s in %s", plural(len(classes), "class", "classes"), plural(len(sections), "section", "sections")), err
	}); err != nil {
		return Proposal{}, "", err
	}
	chosen := sectionSet(sections)
	var blockRows []Row
	var notes []string
	useBlocks := in["blocks"] == "true"
	if useBlocks {
		if err := trace.Run(stepByKey(w, "plan_blocks"), func() (string, error) {
			var err error
			blockRows, notes, err = w.planBlocks(ctx, s, year.ID, classes, gradesInScope(classes, chosen))
			return plural(len(blockRows), "option block", "option blocks"), err
		}); err != nil {
			return Proposal{}, "", err
		}
	}
	var results []timetablemodule.ClassGenerationResult
	if err := trace.Run(stepByKey(w, "preview"), func() (string, error) {
		return "rolled back", s.dryRun(ctx, func(tx *Store) error {
			var err error
			_, results, err = w.build(ctx, tx, *year, sections, blockRows, useBlocks, actorFrom(ctx))
			return err
		})
	}); err != nil {
		return Proposal{}, "", err
	}

	sectionName := map[uuid.UUID]string{}
	for _, sec := range sections {
		sectionName[sec.ID] = sec.Name
	}
	classSection := map[uuid.UUID]string{}
	for _, c := range classes {
		classSection[c.ClassID] = sectionName[c.SectionID]
	}
	var classRows []Row
	complete, withGaps, skipped, replaced := 0, 0, 0, 0
	for _, r := range results {
		row := Row{ID: r.ClassID.String(), Group: classSection[r.ClassID], Cells: map[string]string{"class": r.ClassName, "now": statusLabel(status[r.ClassID]),
			"placed": fmt.Sprintf("%d of %d", r.Placed, r.Required)}}
		switch {
		case r.Skipped:
			skipped++
			row.Cells["placed"] = "-"
			row.Reason = "Left alone: the timetable is " + statusLabel(status[r.ClassID]) + "."
		case len(r.Gaps) > 0:
			withGaps++
			row.Warning = gapSummary(r.Gaps)
		default:
			complete++
			row.Reason = "Every period placed."
		}
		if !r.Skipped && status[r.ClassID] == "draft" {
			replaced++
		}
		classRows = append(classRows, row)
	}
	p := Proposal{
		Summary: []Stat{
			{Label: "Classes", Value: strconv.Itoa(len(results))},
			{Label: "Complete", Value: strconv.Itoa(complete)},
			{Label: "With gaps", Value: strconv.Itoa(withGaps)},
			{Label: "Left alone", Value: strconv.Itoa(skipped)},
			{Label: "Option blocks", Value: strconv.Itoa(len(blockRows))},
		},
		Warnings: notes,
		Sections: []Section{
			{Key: "classes", Title: "Timetables", Description: "What each class gets, from a dry run of the generator. Unticking a block changes this; propose again to see the new result.", Columns: []Column{
				{Key: "class", Label: "Class", Type: "text"}, {Key: "now", Label: "Now", Type: "text"}, {Key: "placed", Label: "Periods placed", Type: "text"},
			}, Rows: classRows},
			{Key: "blocks", Title: "Option blocks", Description: "Each block runs its subjects at the same periods in all its classes. Untick a block to timetable its subjects as ordinary lessons.", Columns: []Column{
				{Key: "grade", Label: "Grade", Type: "text"}, {Key: "name", Label: "Block", Type: "text"}, {Key: "subjects", Label: "Subjects", Type: "text"},
				{Key: "classes", Label: "Classes", Type: "text"}, {Key: "periods", Label: "Periods a week", Type: "number"}, {Key: "create", Label: "Use", Type: "boolean", Editable: true},
			}, Rows: blockRows},
		},
	}
	if replaced > 0 {
		p.Warnings = append(p.Warnings, fmt.Sprintf("%s already have a draft; applying replaces it, and revert cannot bring the old draft back.", plural(replaced, "class", "classes")))
	}
	if withGaps > 0 {
		p.Warnings = append(p.Warnings, fmt.Sprintf("%s have gaps. Fix the setup and propose again, or fill the gaps by hand in the timetable editor.", plural(withGaps, "class", "classes")))
	}
	return p, "timetable:" + year.ID.String(), nil
}

func statusLabel(s string) string {
	switch s {
	case "":
		return "no timetable"
	case "under_review":
		return "under review"
	}
	return s
}

func gapSummary(gaps []timetablemodule.GenerationGap) string {
	var parts []string
	for i, g := range gaps {
		if i == 3 {
			parts = append(parts, fmt.Sprintf("and %d more", len(gaps)-3))
			break
		}
		label := g.SubjectName
		if label == "" {
			label = "Timetable"
		}
		parts = append(parts, label+": "+g.Reason)
	}
	return strings.Join(parts, "; ") + "."
}

func (w Timetable) Apply(ctx context.Context, tx *Store, in Inputs, p Proposal, actor uuid.UUID, trace *Trace) (json.RawMessage, string, error) {
	year, sections, err := w.scope(ctx, tx, in)
	if err != nil {
		return nil, "", err
	}
	if year == nil {
		return nil, "", fmt.Errorf("%w: the year no longer exists", ErrInvalidProposal)
	}
	var blockRows []Row
	if section := p.Section("blocks"); section != nil {
		blockRows = section.Rows
	}
	useBlocks := in["blocks"] == "true"
	var snap timetableSnapshot
	var results []timetablemodule.ClassGenerationResult
	_ = trace.Run(stepByKey(w, "save_blocks"), func() (string, error) {
		used := 0
		for _, r := range blockRows {
			if r.Cells["create"] == "true" {
				used++
			}
		}
		if !useBlocks {
			return "option blocks not used", nil
		}
		return plural(used, "option block", "option blocks") + " to save", nil
	})
	if err := trace.Run(stepByKey(w, "generate"), func() (string, error) {
		var err error
		snap, results, err = w.build(ctx, tx, *year, sections, blockRows, useBlocks, actor)
		gaps := 0
		for _, r := range results {
			gaps += len(r.Gaps)
		}
		return fmt.Sprintf("%s generated, %s", plural(len(snap.Timetables), "draft", "drafts"), plural(gaps, "gap", "gaps")), err
	}); err != nil {
		return nil, "", err
	}
	data, _ := json.Marshal(snap)
	return data, fmt.Sprintf("Generated %s with %s", plural(len(snap.Timetables), "draft timetable", "draft timetables"), plural(len(snap.CreatedBlocks), "option block", "option blocks")), nil
}

func (Timetable) Revert(ctx context.Context, tx *Store, snapshot json.RawMessage) error {
	var snap timetableSnapshot
	if err := json.Unmarshal(snapshot, &snap); err != nil {
		return err
	}
	moved, err := tx.timetablesPastDraft(ctx, snap.Timetables)
	if err != nil {
		return err
	}
	if moved {
		return errTimetablesInUse
	}
	if err := tx.deleteDraftTimetables(ctx, snap.Timetables); err != nil {
		return err
	}
	if err := tx.deleteOptionBlocks(ctx, snap.CreatedBlocks); err != nil {
		return err
	}
	for _, b := range snap.PreviousBlocks {
		if _, err := tx.createOptionBlock(ctx, snap.Year, b); err != nil {
			return err
		}
	}
	return nil
}
