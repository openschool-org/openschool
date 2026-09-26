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
	if cur := currentYear(years); cur != nil {
		fields[0].Default = cur.ID.String()
		for _, y := range years {
			if !y.Current && y.Start.After(cur.Start) {
				fields[1].Default = y.ID.String()
				break
			}
		}
	}
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

	teacherName := map[uuid.UUID]string{}
	active := map[uuid.UUID]bool{}
	allOptions := make([]Option, len(teachers))
	for i, t := range teachers {
		teacherName[t.ID] = t.Name
		active[t.ID] = true
		allOptions[i] = Option{Value: t.ID.String(), Label: t.Name}
	}
	sourceByID := map[uuid.UUID]YearClass{}
	for _, c := range sourceClasses {
		sourceByID[c.ID] = c
	}
	grades, err := s.grades(ctx)
	if err != nil {
		return Proposal{}, "", err
	}
	prevGrade := previousGrades(grades)
	// Fall back to the same section letter in the grade below when no students are placed yet.
	previousOf := func(c YearClass) (YearClass, bool) {
		if id, ok := predecessors[c.ID]; ok {
			sc, found := sourceByID[id]
			return sc, found
		}
		for _, sc := range sourceClasses {
			if sc.GradeID == prevGrade[c.GradeID] && sectionOf(sc.Name) == sectionOf(c.Name) {
				return sc, true
			}
		}
		return YearClass{}, false
	}
	type pair struct{ class, subject uuid.UUID }
	current, previous := map[pair]uuid.UUID{}, map[pair]uuid.UUID{}
	for _, a := range existing {
		current[pair{a.ClassID, a.SubjectID}] = a.TeacherID
	}
	for _, a := range lastYear {
		previous[pair{a.ClassID, a.SubjectID}] = a.TeacherID
	}
	hoursByGrade := map[uuid.UUID][]SubjectHours{}
	for _, h := range hours {
		hoursByGrade[h.GradeID] = append(hoursByGrade[h.GradeID], h)
	}
	sort.SliceStable(classes, func(i, j int) bool {
		if classes[i].GradeOrder != classes[j].GradeOrder {
			return classes[i].GradeOrder < classes[j].GradeOrder
		}
		return naturalLess(classes[i].Name, classes[j].Name)
	})

	var needs []AllocNeed
	for _, c := range classes {
		prev, hasPrev := previousOf(c)
		for _, h := range hoursByGrade[c.GradeID] {
			n := AllocNeed{ClassID: c.ID, ClassName: c.Name, GradeID: c.GradeID, GradeOrder: c.GradeOrder, SubjectID: h.SubjectID, SubjectName: h.SubjectName, Periods: h.Periods}
			if t, ok := current[pair{c.ID, h.SubjectID}]; ok && active[t] {
				n.Existing = t
			}
			if hasPrev {
				n.Continuity, n.PreviousClass = previous[pair{prev.ID, h.SubjectID}], prev.Name
			}
			needs = append(needs, n)
		}
	}
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

	rows := make([]Row, len(needs))
	unfilled := 0
	classCount := map[uuid.UUID]map[uuid.UUID]bool{}
	periodsInClass := map[uuid.UUID]map[uuid.UUID]int{}
	for i, n := range needs {
		r := results[i]
		var options []Option
		for _, t := range teachers {
			if t.Subjects[n.SubjectID] {
				options = append(options, Option{Value: t.ID.String(), Label: t.Name})
			}
		}
		if len(options) == 0 {
			options = allOptions
		}
		value := ""
		if r.TeacherID != uuid.Nil {
			value = r.TeacherID.String()
			if classCount[r.TeacherID] == nil {
				classCount[r.TeacherID] = map[uuid.UUID]bool{}
			}
			classCount[r.TeacherID][n.ClassID] = true
			if periodsInClass[n.ClassID] == nil {
				periodsInClass[n.ClassID] = map[uuid.UUID]int{}
			}
			periodsInClass[n.ClassID][r.TeacherID] += n.Periods
		} else {
			unfilled++
		}
		rows[i] = Row{ID: n.ClassID.String() + ":" + n.SubjectID.String(), Group: n.ClassName, Reason: r.Reason, Warning: r.Warning,
			Options: map[string][]Option{"teacher": options},
			Cells:   map[string]string{"class": n.ClassName, "subject": n.SubjectName, "periods": strconv.Itoa(n.Periods), "teacher": value, "class_id": n.ClassID.String(), "subject_id": n.SubjectID.String()}}
	}

	var loadRows []Row
	for _, t := range teachers {
		if load[t.ID] == 0 {
			continue
		}
		row := Row{ID: t.ID.String(), Cells: map[string]string{"teacher": t.Name, "periods": strconv.Itoa(load[t.ID]), "classes": strconv.Itoa(len(classCount[t.ID]))}}
		if load[t.ID] > limit {
			row.Warning = "Over the limit because of assignments already made."
		}
		loadRows = append(loadRows, row)
	}
	sort.SliceStable(loadRows, func(i, j int) bool {
		a, _ := strconv.Atoi(loadRows[i].Cells["periods"])
		b, _ := strconv.Atoi(loadRows[j].Cells["periods"])
		return a > b
	})

	var formRows []Row
	if in["form_teachers"] == "true" {
		taken := map[uuid.UUID]bool{}
		for _, c := range classes {
			if c.FormTeacherID != nil {
				taken[*c.FormTeacherID] = true
			}
		}
		for _, c := range classes {
			if c.FormTeacherID != nil {
				continue
			}
			var pick uuid.UUID
			reason := "No teacher is free to suggest; pick one by hand."
			if prev, ok := previousOf(c); ok && prev.FormTeacherID != nil && active[*prev.FormTeacherID] && !taken[*prev.FormTeacherID] {
				pick, reason = *prev.FormTeacherID, "Form teacher of "+prev.Name+" last year."
			} else {
				best := 0
				for t, p := range periodsInClass[c.ID] {
					if !taken[t] && (p > best || (p == best && pick != uuid.Nil && t.String() < pick.String())) {
						pick, best = t, p
					}
				}
				if pick != uuid.Nil {
					reason = fmt.Sprintf("Teaches this class the most (%d periods a week).", best)
				}
			}
			value := ""
			if pick != uuid.Nil {
				taken[pick] = true
				value = pick.String()
			}
			formRows = append(formRows, Row{ID: c.ID.String(), Group: c.GradeName, Reason: reason,
				Cells: map[string]string{"class": c.Name, "teacher": value, "set": strconv.FormatBool(pick != uuid.Nil)}})
		}
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
				{Key: "class", Label: "Class", Type: "text"}, {Key: "teacher", Label: "Form teacher", Type: "select", Editable: true, Options: allOptions},
				{Key: "set", Label: "Set", Type: "boolean", Editable: true},
			}, Rows: formRows},
		},
	}
	if unfilled > 0 {
		p.Warnings = append(p.Warnings, fmt.Sprintf("%s have no teacher. The timetable will show them as gaps until you pick one.", plural(unfilled, "class subject", "class subjects")))
	}
	return p, "teacher_allocation:" + target.String(), nil
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
