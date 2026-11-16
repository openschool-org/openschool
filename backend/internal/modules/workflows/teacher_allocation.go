package workflows

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strconv"

	"github.com/google/uuid"
)

// TeacherAllocation (W6) gives every class subject next year a qualified teacher, keeping last
// year's teacher with the class where they fit, within a weekly period limit, and suggests form
// teachers. It writes the class subject teachers the timetable generator reads.
type TeacherAllocation struct{}

func (TeacherAllocation) Key() string   { return "teacher_allocation" }
func (TeacherAllocation) Title() string { return "Teacher allocation" }
func (TeacherAllocation) Description() string {
	return "Assigns a qualified teacher to every class and subject next year, keeping last year's teacher with the class where possible and no one over the weekly period limit. Also suggests form teachers."
}

var (
	ToolReadSubjectHours    = tool("read_subject_hours", "Reads the weekly periods each grade needs per subject.", false)
	ToolReadTeachers        = tool("read_teachers", "Reads active teachers, the subjects they are qualified for and who taught each class last year.", false)
	ToolAllocateTeachers    = tool("allocate_teachers", "Deterministic allocation: keeps assignments already made, then fills the scarcest subjects first, preferring continuity and the lightest week.", false)
	ToolSaveSubjectTeachers = tool("save_subject_teachers", "Writes the teacher for each class subject; the timetable generator uses these.", true)
	ToolSetFormTeachers     = tool("set_form_teachers", "Sets the form teacher of each ticked class.", true)
)

func (TeacherAllocation) Steps() []StepInfo {
	return []StepInfo{
		{Key: "read_classes", Title: "Read next year's classes", Tool: ToolReadClasses, Phase: "propose"},
		{Key: "read_hours", Title: "Read subject hours per grade", Tool: ToolReadSubjectHours, Phase: "propose"},
		{Key: "read_teachers", Title: "Read teachers, qualifications and last year", Tool: ToolReadTeachers, Phase: "propose"},
		{Key: "allocate", Title: "Allocate teachers", Tool: ToolAllocateTeachers, Phase: "propose"},
		{Key: "save_teachers", Title: "Save subject teachers", Tool: ToolSaveSubjectTeachers, Phase: "apply"},
		{Key: "set_form_teachers", Title: "Set form teachers", Tool: ToolSetFormTeachers, Phase: "apply"},
	}
}

const defaultMaxPeriods = "35"

func (TeacherAllocation) Inputs(ctx context.Context, s *Store) ([]InputField, error) {
	years, err := s.years(ctx)
	if err != nil {
		return nil, err
	}
	fields := []InputField{
		{Key: "source_year", Label: "Last year", Type: "select", Required: true, Options: yearOptions(years), Help: "Used to keep teachers with their classes."},
		{Key: "target_year", Label: "Allocate for year", Type: "select", Required: true, Options: yearOptions(years)},
		{Key: "max_periods", Label: "Most periods a teacher takes each week", Type: "text", Required: true, Default: defaultMaxPeriods},
		{Key: "form_teachers", Label: "Suggest form teachers for classes without one", Type: "boolean", Default: "true"},
	}
	fields[0].Default, fields[1].Default = yearDefaults(years)
	return fields, nil
}

func (TeacherAllocation) Check(ctx context.Context, s *Store, in Inputs) ([]Check, error) {
	source, okS := parseID(in["source_year"])
	target, okT := parseID(in["target_year"])
	valid := okS && okT && source != target
	if valid {
		if _, err := s.year(ctx, source); err != nil {
			valid = false
		} else if _, err := s.year(ctx, target); err != nil {
			valid = false
		}
	}
	limit, err := strconv.Atoi(in["max_periods"])
	checks := []Check{
		{Key: "years", Title: "Two different years are chosen", OK: valid, Blocking: true},
		{Key: "limit", Title: "The period limit is a positive number", OK: err == nil && limit > 0, Blocking: true},
	}
	if !valid {
		return checks, nil
	}
	classes, err := s.yearClasses(ctx, target)
	if err != nil {
		return nil, err
	}
	hours, err := s.subjectHours(ctx, target)
	if err != nil {
		return nil, err
	}
	teachers, err := s.activeTeachers(ctx)
	if err != nil {
		return nil, err
	}
	withHours := map[uuid.UUID]bool{}
	for _, h := range hours {
		withHours[h.GradeID] = true
	}
	placed, gradesWithout := 0, map[string]bool{}
	for _, c := range classes {
		placed += int(c.Students)
		if !withHours[c.GradeID] {
			gradesWithout[c.GradeName] = true
		}
	}
	qualified := 0
	for _, t := range teachers {
		if len(t.Subjects) > 0 {
			qualified++
		}
	}
	checks = append(checks,
		Check{Key: "classes", Title: "Next year has classes", OK: len(classes) > 0, Blocking: true, FixPath: "/year-end/year_rollover", Detail: plural(len(classes), "class", "classes")},
		Check{Key: "hours", Title: "Subject hours are set for next year", OK: len(hours) > 0, Blocking: true, FixPath: "/subject-requirements",
			Detail: fmt.Sprintf("%s have no subject hours and will get no teachers.", plural(len(gradesWithout), "grade", "grades"))},
		Check{Key: "qualifications", Title: "Teachers have their subjects recorded", OK: qualified > 0 && qualified == len(teachers), Blocking: qualified == 0, FixPath: "/teacher-subjects",
			Detail: fmt.Sprintf("%d of %s have subjects.", qualified, plural(len(teachers), "active teacher", "active teachers"))},
		Check{Key: "promotion", Title: "Students are placed in next year's classes", OK: placed > 0, FixPath: "/year-end/promotion",
			Detail: "Without placements, last year's teacher is matched by section letter only."},
	)
	return checks, nil
}

func (w TeacherAllocation) Propose(ctx context.Context, s *Store, in Inputs, trace *Trace) (Proposal, string, error) {
	source, _ := parseID(in["source_year"])
	target, _ := parseID(in["target_year"])
	limit, _ := strconv.Atoi(in["max_periods"])

	var classes, sourceClasses []YearClass
	if err := trace.Run(stepByKey(w, "read_classes"), func() (string, error) {
		var err error
		if classes, err = s.yearClasses(ctx, target); err != nil {
			return "", err
		}
		sourceClasses, err = s.yearClasses(ctx, source)
		return plural(len(classes), "class", "classes"), err
	}); err != nil {
		return Proposal{}, "", err
	}
	var hours []SubjectHours
	if err := trace.Run(stepByKey(w, "read_hours"), func() (string, error) {
		var err error
		hours, err = s.subjectHours(ctx, target)
		return plural(len(hours), "grade subject", "grade subjects"), err
	}); err != nil {
		return Proposal{}, "", err
	}
	var teachers []TeacherInfo
	var existing, lastYear []SubjectTeacher
	var predecessors map[uuid.UUID]uuid.UUID
	if err := trace.Run(stepByKey(w, "read_teachers"), func() (string, error) {
		var err error
		if teachers, err = s.activeTeachers(ctx); err != nil {
			return "", err
		}
		if existing, err = s.yearSubjectTeachers(ctx, target); err != nil {
			return "", err
		}
		if lastYear, err = s.yearSubjectTeachers(ctx, source); err != nil {
			return "", err
		}
		predecessors, err = s.classPredecessors(ctx, source, target)
		return plural(len(teachers), "active teacher", "active teachers"), err
	}); err != nil {
		return Proposal{}, "", err
	}

	grades, err := s.grades(ctx)
	if err != nil {
		return Proposal{}, "", err
	}
	plan := newAllocationPlan(classes, sourceClasses, teachers, predecessors, previousGrades(grades))
	needs := plan.needs(hours, existing, lastYear)
	var results map[int]AllocResult
	var load map[uuid.UUID]int
	_ = trace.Run(stepByKey(w, "allocate"), func() (string, error) {
		results, load = Allocate(needs, teachers, limit)
		filled := 0
		for _, r := range results {
			if r.TeacherID != uuid.Nil {
				filled++
			}
		}
		return fmt.Sprintf("%d of %d class subjects filled", filled, len(needs)), nil
	})

	rows, unfilled := plan.allocationRows(needs, results)
	loadRows := plan.loadRows(load, limit)
	var formRows []Row
	if in["form_teachers"] == "true" {
		formRows = plan.formTeacherRows()
	}

	p := Proposal{
		Summary: []Stat{
			{Label: "Class subjects", Value: strconv.Itoa(len(needs))},
			{Label: "Filled", Value: strconv.Itoa(len(needs) - unfilled)},
			{Label: "Not filled", Value: strconv.Itoa(unfilled)},
			{Label: "Teachers used", Value: strconv.Itoa(len(loadRows))},
			{Label: "Period limit", Value: strconv.Itoa(limit)},
		},
		Sections: []Section{
			{Key: "allocations", Title: "Subject teachers", Description: "Change any teacher here; the list shows teachers qualified for the subject.", Columns: []Column{
				{Key: "class", Label: "Class", Type: "text"}, {Key: "subject", Label: "Subject", Type: "text"}, {Key: "periods", Label: "Periods", Type: "number"},
				{Key: "teacher", Label: "Teacher", Type: "select", Editable: true},
			}, Rows: rows},
			{Key: "load", Title: "Teacher load", Description: "As proposed, before any changes you make above.", Columns: []Column{
				{Key: "teacher", Label: "Teacher", Type: "text"}, {Key: "periods", Label: "Periods a week", Type: "number"}, {Key: "classes", Label: "Classes", Type: "number"},
			}, Rows: loadRows},
			{Key: "form_teachers", Title: "Form teachers", Description: "Classes without a form teacher. Untick to leave a class without one.", Columns: []Column{
				{Key: "class", Label: "Class", Type: "text"}, {Key: "teacher", Label: "Form teacher", Type: "select", Editable: true, Options: plan.allOptions},
				{Key: "set", Label: "Set", Type: "boolean", Editable: true},
			}, Rows: formRows},
		},
	}
	if unfilled > 0 {
		p.Warnings = append(p.Warnings, fmt.Sprintf("%s have no teacher. The timetable will show them as gaps until you pick one.", plural(unfilled, "class subject", "class subjects")))
	}
	return p, "teacher_allocation:" + target.String(), nil
}

type classSubject struct{ class, subject uuid.UUID }

// allocationPlan holds what the allocation proposal reads, plus the per-class results it builds up.
type allocationPlan struct {
	classes, sourceClasses []YearClass
	sourceByID             map[uuid.UUID]YearClass
	teachers               []TeacherInfo
	active                 map[uuid.UUID]bool
	allOptions             []Option
	predecessors           map[uuid.UUID]uuid.UUID
	prevGrade              map[uuid.UUID]uuid.UUID

	classCount     map[uuid.UUID]map[uuid.UUID]bool // teacher -> classes taught
	periodsInClass map[uuid.UUID]map[uuid.UUID]int  // class -> teacher -> periods
}

func newAllocationPlan(classes, sourceClasses []YearClass, teachers []TeacherInfo, predecessors, prevGrade map[uuid.UUID]uuid.UUID) *allocationPlan {
	p := &allocationPlan{classes: classes, sourceClasses: sourceClasses, teachers: teachers, predecessors: predecessors, prevGrade: prevGrade,
		sourceByID: map[uuid.UUID]YearClass{}, active: map[uuid.UUID]bool{}, allOptions: make([]Option, len(teachers)),
		classCount: map[uuid.UUID]map[uuid.UUID]bool{}, periodsInClass: map[uuid.UUID]map[uuid.UUID]int{}}
	for i, t := range teachers {
		p.active[t.ID] = true
		p.allOptions[i] = Option{Value: t.ID.String(), Label: t.Name}
	}
	for _, c := range sourceClasses {
		p.sourceByID[c.ID] = c
	}
	sort.SliceStable(p.classes, func(i, j int) bool {
		if p.classes[i].GradeOrder != p.classes[j].GradeOrder {
			return p.classes[i].GradeOrder < p.classes[j].GradeOrder
		}
		return naturalLess(p.classes[i].Name, p.classes[j].Name)
	})
	return p
}

// previousOf finds last year's class; it falls back to the same section letter in the grade below when no students are placed yet.
func (p *allocationPlan) previousOf(c YearClass) (YearClass, bool) {
	if id, ok := p.predecessors[c.ID]; ok {
		sc, found := p.sourceByID[id]
		return sc, found
	}
	for _, sc := range p.sourceClasses {
		if sc.GradeID == p.prevGrade[c.GradeID] && sectionOf(sc.Name) == sectionOf(c.Name) {
			return sc, true
		}
	}
	return YearClass{}, false
}

func (p *allocationPlan) needs(hours []SubjectHours, existing, lastYear []SubjectTeacher) []AllocNeed {
	current, previous := map[classSubject]uuid.UUID{}, map[classSubject]uuid.UUID{}
	for _, a := range existing {
		current[classSubject{a.ClassID, a.SubjectID}] = a.TeacherID
	}
	for _, a := range lastYear {
		previous[classSubject{a.ClassID, a.SubjectID}] = a.TeacherID
	}
	hoursByGrade := map[uuid.UUID][]SubjectHours{}
	for _, h := range hours {
		hoursByGrade[h.GradeID] = append(hoursByGrade[h.GradeID], h)
	}
	var needs []AllocNeed
	for _, c := range p.classes {
		prev, hasPrev := p.previousOf(c)
		for _, h := range hoursByGrade[c.GradeID] {
			n := AllocNeed{ClassID: c.ID, ClassName: c.Name, GradeID: c.GradeID, GradeOrder: c.GradeOrder, SubjectID: h.SubjectID, SubjectName: h.SubjectName, Periods: h.Periods}
			if t, ok := current[classSubject{c.ID, h.SubjectID}]; ok && p.active[t] {
				n.Existing = t
			}
			if hasPrev {
				n.Continuity, n.PreviousClass = previous[classSubject{prev.ID, h.SubjectID}], prev.Name
			}
			needs = append(needs, n)
		}
	}
	return needs
}

// subjectOptions lists teachers qualified for the subject, or every teacher when none is.
func (p *allocationPlan) subjectOptions(subject uuid.UUID) []Option {
	var options []Option
	for _, t := range p.teachers {
		if t.Subjects[subject] {
			options = append(options, Option{Value: t.ID.String(), Label: t.Name})
		}
	}
	if len(options) == 0 {
		return p.allOptions
	}
	return options
}

func (p *allocationPlan) record(teacher, class uuid.UUID, periods int) {
	if p.classCount[teacher] == nil {
		p.classCount[teacher] = map[uuid.UUID]bool{}
	}
	p.classCount[teacher][class] = true
	if p.periodsInClass[class] == nil {
		p.periodsInClass[class] = map[uuid.UUID]int{}
	}
	p.periodsInClass[class][teacher] += periods
}

func (p *allocationPlan) allocationRows(needs []AllocNeed, results map[int]AllocResult) ([]Row, int) {
	rows := make([]Row, len(needs))
	unfilled := 0
	for i, n := range needs {
		r := results[i]
		value := ""
		if r.TeacherID != uuid.Nil {
			value = r.TeacherID.String()
			p.record(r.TeacherID, n.ClassID, n.Periods)
		} else {
			unfilled++
		}
		rows[i] = Row{ID: n.ClassID.String() + ":" + n.SubjectID.String(), Group: n.ClassName, Reason: r.Reason, Warning: r.Warning,
			Options: map[string][]Option{"teacher": p.subjectOptions(n.SubjectID)},
			Cells:   map[string]string{"class": n.ClassName, "subject": n.SubjectName, "periods": strconv.Itoa(n.Periods), "teacher": value, "class_id": n.ClassID.String(), "subject_id": n.SubjectID.String()}}
	}
	return rows, unfilled
}

func (p *allocationPlan) loadRows(load map[uuid.UUID]int, limit int) []Row {
	var rows []Row
	for _, t := range p.teachers {
		if load[t.ID] == 0 {
			continue
		}
		row := Row{ID: t.ID.String(), Cells: map[string]string{"teacher": t.Name, "periods": strconv.Itoa(load[t.ID]), "classes": strconv.Itoa(len(p.classCount[t.ID]))}}
		if load[t.ID] > limit {
			row.Warning = "Over the limit because of assignments already made."
		}
		rows = append(rows, row)
	}
	sort.SliceStable(rows, func(i, j int) bool {
		a, _ := strconv.Atoi(rows[i].Cells["periods"])
		b, _ := strconv.Atoi(rows[j].Cells["periods"])
		return a > b
	})
	return rows
}

// formTeacherRows suggests a form teacher for each class without one.
func (p *allocationPlan) formTeacherRows() []Row {
	taken := map[uuid.UUID]bool{}
	for _, c := range p.classes {
		if c.FormTeacherID != nil {
			taken[*c.FormTeacherID] = true
		}
	}
	var rows []Row
	for _, c := range p.classes {
		if c.FormTeacherID != nil {
			continue
		}
		pick, reason := p.suggestFormTeacher(c, taken)
		value := ""
		if pick != uuid.Nil {
			taken[pick] = true
			value = pick.String()
		}
		rows = append(rows, Row{ID: c.ID.String(), Group: c.GradeName, Reason: reason,
			Cells: map[string]string{"class": c.Name, "teacher": value, "set": strconv.FormatBool(pick != uuid.Nil)}})
	}
	return rows
}

// suggestFormTeacher keeps last year's form teacher when free, else picks the free teacher with the most periods in the class.
func (p *allocationPlan) suggestFormTeacher(c YearClass, taken map[uuid.UUID]bool) (uuid.UUID, string) {
	if prev, ok := p.previousOf(c); ok && prev.FormTeacherID != nil && p.active[*prev.FormTeacherID] && !taken[*prev.FormTeacherID] {
		return *prev.FormTeacherID, "Form teacher of " + prev.Name + " last year."
	}
	var pick uuid.UUID
	best := 0
	for t, n := range p.periodsInClass[c.ID] {
		if !taken[t] && (n > best || (n == best && pick != uuid.Nil && t.String() < pick.String())) {
			pick, best = t, n
		}
	}
	if pick == uuid.Nil {
		return pick, "No teacher is free to suggest; pick one by hand."
	}
	return pick, fmt.Sprintf("Teaches this class the most (%d periods a week).", best)
}

type allocationSnapshot struct {
	Classes      []uuid.UUID           `json:"classes"`
	Touched      []SubjectTeacher      `json:"touched"` // class and subject of every written row; teacher unused
	Previous     []SubjectTeacher      `json:"previous"`
	FormPrevious map[string]*uuid.UUID `json:"form_previous"`
}

func (w TeacherAllocation) Apply(ctx context.Context, tx *Store, in Inputs, p Proposal, _ uuid.UUID, trace *Trace) (json.RawMessage, string, error) {
	target, _ := parseID(in["target_year"])
	snap := allocationSnapshot{FormPrevious: map[string]*uuid.UUID{}}
	classSet := map[uuid.UUID]bool{}
	written := 0
	if err := trace.Run(stepByKey(w, "save_teachers"), func() (string, error) {
		before, err := tx.yearSubjectTeachers(ctx, target)
		if err != nil {
			return "", err
		}
		type pair struct{ class, subject uuid.UUID }
		had := map[pair]uuid.UUID{}
		for _, a := range before {
			had[pair{a.ClassID, a.SubjectID}] = a.TeacherID
		}
		for _, r := range p.Section("allocations").Rows {
			class, okC := parseID(r.Cells["class_id"])
			subject, okS := parseID(r.Cells["subject_id"])
			if !okC || !okS {
				continue
			}
			teacher := optionalID(r.Cells["teacher"])
			old, existed := had[pair{class, subject}]
			if (teacher == nil && !existed) || (teacher != nil && existed && *teacher == old) {
				continue
			}
			if existed {
				snap.Previous = append(snap.Previous, SubjectTeacher{ClassID: class, SubjectID: subject, TeacherID: old})
			}
			snap.Touched = append(snap.Touched, SubjectTeacher{ClassID: class, SubjectID: subject})
			if err := tx.setSubjectTeacher(ctx, class, subject, teacher); err != nil {
				return "", fmt.Errorf("%s %s: %w", r.Cells["class"], r.Cells["subject"], err)
			}
			classSet[class] = true
			written++
		}
		return plural(written, "assignment", "assignments") + " written", nil
	}); err != nil {
		return nil, "", err
	}
	formSet := 0
	if err := trace.Run(stepByKey(w, "set_form_teachers"), func() (string, error) {
		classes, err := tx.yearClasses(ctx, target)
		if err != nil {
			return "", err
		}
		current := map[uuid.UUID]*uuid.UUID{}
		for _, c := range classes {
			current[c.ID] = c.FormTeacherID
		}
		if section := p.Section("form_teachers"); section != nil {
			for _, r := range section.Rows {
				class, ok := parseID(r.ID)
				teacher := optionalID(r.Cells["teacher"])
				if !ok || r.Cells["set"] != "true" || teacher == nil {
					continue
				}
				snap.FormPrevious[class.String()] = current[class]
				if err := tx.setFormTeacher(ctx, class, teacher); err != nil {
					return "", err
				}
				classSet[class] = true
				formSet++
			}
		}
		return plural(formSet, "form teacher", "form teachers") + " set", nil
	}); err != nil {
		return nil, "", err
	}
	for id := range classSet {
		snap.Classes = append(snap.Classes, id)
	}
	data, _ := json.Marshal(snap)
	return data, fmt.Sprintf("Saved %s and %s", plural(written, "subject teacher", "subject teachers"), plural(formSet, "form teacher", "form teachers")), nil
}

func (TeacherAllocation) Revert(ctx context.Context, tx *Store, snapshot json.RawMessage) error {
	var snap allocationSnapshot
	if err := json.Unmarshal(snapshot, &snap); err != nil {
		return err
	}
	used, err := tx.classesHaveSubmittedTimetables(ctx, snap.Classes)
	if err != nil {
		return err
	}
	if used {
		return errTimetablesInUse
	}
	type pair struct{ class, subject uuid.UUID }
	previous := map[pair]uuid.UUID{}
	for _, a := range snap.Previous {
		previous[pair{a.ClassID, a.SubjectID}] = a.TeacherID
	}
	for _, t := range snap.Touched {
		var teacher *uuid.UUID
		if old, ok := previous[pair{t.ClassID, t.SubjectID}]; ok {
			teacher = &old
		}
		if err := tx.setSubjectTeacher(ctx, t.ClassID, t.SubjectID, teacher); err != nil {
			return err
		}
	}
	for class, teacher := range snap.FormPrevious {
		id, ok := parseID(class)
		if !ok {
			continue
		}
		if err := tx.setFormTeacher(ctx, id, teacher); err != nil {
			return err
		}
	}
	return nil
}
