package workflows

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/google/uuid"
)

// YearRollover (W1) creates next year's academic year, terms, classes and timetable setup from this year's.
type YearRollover struct{}

func (YearRollover) Key() string   { return "year_rollover" }
func (YearRollover) Title() string { return "Year rollover" }
func (YearRollover) Description() string {
	return "Creates next academic year with the same terms, classes, homerooms, capacities and timetable setup as this year. Students are not moved here; that is Promotion."
}

func (YearRollover) Steps() []StepInfo {
	return []StepInfo{
		{Key: "read_source", Title: "Read this year", Tool: ToolReadYears, Phase: "propose"},
		{Key: "read_classes", Title: "Read this year's classes", Tool: ToolReadClasses, Phase: "propose"},
		{Key: "read_terms", Title: "Read this year's terms", Tool: ToolReadTerms, Phase: "propose"},
		{Key: "create_year", Title: "Create the new year", Tool: ToolCreateYear, Phase: "apply"},
		{Key: "copy_terms", Title: "Copy terms", Tool: ToolCopyTerms, Phase: "apply"},
		{Key: "copy_classes", Title: "Copy classes with homerooms", Tool: ToolCopyClasses, Phase: "apply"},
		{Key: "copy_timetable_setup", Title: "Copy timetable setup", Tool: ToolCopyTimetableSetup, Phase: "apply"},
	}
}

func (YearRollover) Inputs(ctx context.Context, s *Store) ([]InputField, error) {
	years, err := s.years(ctx)
	if err != nil {
		return nil, err
	}
	fields := []InputField{
		{Key: "source_year", Label: "Copy from", Type: "select", Required: true, Options: yearOptions(years)},
		{Key: "label", Label: "New year name", Type: "text", Required: true, Help: "Usually the calendar year, for example 2027."},
		{Key: "start_date", Label: "Starts", Type: "date", Required: true},
		{Key: "end_date", Label: "Ends", Type: "date", Required: true},
		{Key: "copy_form_teachers", Label: "Keep the same form teachers", Type: "boolean", Default: "false", Help: "Off by default; form teachers usually change."},
		{Key: "copy_timetable_setup", Label: "Copy timetable setup", Type: "boolean", Default: "true", Help: "Grade sections, period grids, subject hours and section heads."},
	}
	if cur := currentYear(years); cur != nil {
		fields[0].Default = cur.ID.String()
		if label := nextLabel(cur.Label); label != "" {
			n, _ := strconv.Atoi(label)
			fields[1].Default = label
			fields[2].Default = fmt.Sprintf("%04d-01-01", n)
			fields[3].Default = fmt.Sprintf("%04d-12-31", n)
		}
	}
	return fields, nil
}

func (w YearRollover) Check(ctx context.Context, s *Store, in Inputs) ([]Check, error) {
	var checks []Check
	source, ok := parseID(in["source_year"])
	var classes []YearClass
	var terms []TermInfo
	var sourceYear Year
	if ok {
		var err error
		if sourceYear, err = s.year(ctx, source); err != nil {
			ok = false
		} else if classes, err = s.yearClasses(ctx, source); err != nil {
			return nil, err
		} else if terms, err = s.terms(ctx, source); err != nil {
			return nil, err
		}
	}
	checks = append(checks, Check{Key: "source_classes", Title: "This year has classes to copy", OK: ok && len(classes) > 0, Blocking: true, FixPath: "/classes",
		Detail: map[bool]string{true: plural(len(classes), "class", "classes") + " found.", false: "Pick a year that has classes."}[ok && len(classes) > 0]})

	label := strings.TrimSpace(in["label"])
	exists := false
	if label != "" {
		var err error
		if exists, err = s.labelExists(ctx, label); err != nil {
			return nil, err
		}
	}
	checks = append(checks, Check{Key: "label_free", Title: "The new year name is not used yet", OK: label != "" && !exists, Blocking: true, FixPath: "/academic-years",
		Detail: map[bool]string{true: "An academic year with this name already exists.", false: ""}[exists]})

	start, okStart := parseDate(in["start_date"])
	end, okEnd := parseDate(in["end_date"])
	checks = append(checks, Check{Key: "dates", Title: "Start and end dates are valid", OK: okStart && okEnd && start.Before(end), Blocking: true})
	if ok && okStart {
		checks = append(checks, Check{Key: "after_source", Title: "The new year starts after this one ends", OK: start.After(sourceYear.End), Detail: "Overlapping years are allowed but unusual."})
	}
	checks = append(checks, Check{Key: "source_terms", Title: "This year has terms to copy", OK: len(terms) > 0, FixPath: "/academic-years", Detail: map[bool]string{true: "", false: "Without terms the new year starts with none; add them later."}[len(terms) > 0]})
	return checks, nil
}

func (w YearRollover) Propose(ctx context.Context, s *Store, in Inputs, trace *Trace) (Proposal, string, error) {
	source, _ := parseID(in["source_year"])
	label := strings.TrimSpace(in["label"])
	start, _ := parseDate(in["start_date"])
	end, _ := parseDate(in["end_date"])
	var src Year
	var classes []YearClass
	var terms []TermInfo
	var sections int
	if err := trace.Run(stepByKey(w, "read_source"), func() (string, error) {
		var err error
		src, err = s.year(ctx, source)
		if err == nil {
			sections, err = s.sectionCount(ctx, source)
		}
		return "Copying from " + src.Label, err
	}); err != nil {
		return Proposal{}, "", err
	}
	if err := trace.Run(stepByKey(w, "read_classes"), func() (string, error) {
		var err error
		classes, err = s.yearClasses(ctx, source)
		return plural(len(classes), "class", "classes"), err
	}); err != nil {
		return Proposal{}, "", err
	}
	if err := trace.Run(stepByKey(w, "read_terms"), func() (string, error) {
		var err error
		terms, err = s.terms(ctx, source)
		return plural(len(terms), "term", "terms"), err
	}); err != nil {
		return Proposal{}, "", err
	}

	shift := start.Year() - src.Start.Year()
	termRows := make([]Row, len(terms))
	for i, t := range terms {
		termRows[i] = Row{ID: t.ID.String(), Cells: map[string]string{"name": t.Name, "start": fmtDate(t.Start.AddDate(shift, 0, 0)), "end": fmtDate(t.End.AddDate(shift, 0, 0))}}
	}
	copyTeachers := in["copy_form_teachers"] == "true"
	classRows := make([]Row, len(classes))
	for i, c := range classes {
		homeroom := c.Homeroom
		if homeroom == "" {
			homeroom = c.Name + " (new)"
		}
		stream := c.StreamName
		if c.StreamGroupName != "" {
			stream += " / " + c.StreamGroupName
		}
		teacher := "No"
		if copyTeachers && c.FormTeacherID != nil {
			teacher = "Yes"
		}
		classRows[i] = Row{ID: c.ID.String(), Group: c.GradeName, Cells: map[string]string{
			"grade": c.GradeName, "class": c.Name, "stream": stream, "medium": c.MediumName, "homeroom": homeroom,
			"capacity": strconv.Itoa(int(c.Capacity)), "form_teacher": teacher, "include": "true",
		}}
	}

	p := Proposal{
		Summary: []Stat{
			{Label: "New year", Value: label},
			{Label: "Classes", Value: strconv.Itoa(len(classes))},
			{Label: "Terms", Value: strconv.Itoa(len(terms))},
			{Label: "Grade sections", Value: map[bool]string{true: strconv.Itoa(sections), false: "Not copied"}[in["copy_timetable_setup"] == "true"]},
		},
		Sections: []Section{
			{Key: "year", Title: "Academic year", Columns: []Column{{Key: "label", Label: "Name", Type: "text"}, {Key: "start", Label: "Starts", Type: "text"}, {Key: "end", Label: "Ends", Type: "text"}},
				Rows: []Row{{ID: "year", Cells: map[string]string{"label": label, "start": fmtDate(start), "end": fmtDate(end)}}}},
			{Key: "terms", Title: "Terms", Description: "Dates move forward by whole years; check them against the Ministry calendar.", Columns: []Column{{Key: "name", Label: "Term", Type: "text"}, {Key: "start", Label: "Starts", Type: "text"}, {Key: "end", Label: "Ends", Type: "text"}}, Rows: termRows},
			{Key: "classes", Title: "Classes", Description: "Untick a class to leave it out of the new year.", Columns: []Column{
				{Key: "grade", Label: "Grade", Type: "text"}, {Key: "class", Label: "Class", Type: "text"}, {Key: "stream", Label: "Stream", Type: "text"},
				{Key: "medium", Label: "Medium", Type: "text"}, {Key: "homeroom", Label: "Homeroom", Type: "text"}, {Key: "capacity", Label: "Capacity", Type: "number"},
				{Key: "form_teacher", Label: "Form teacher kept", Type: "text"}, {Key: "include", Label: "Create", Type: "boolean", Editable: true},
			}, Rows: classRows},
		},
	}
	if len(terms) == 0 {
		p.Warnings = append(p.Warnings, "This year has no terms, so the new year will start with none.")
	}
	return p, "label:" + strings.ToLower(label), nil
}

type rolloverSnapshot struct {
	YearID uuid.UUID `json:"year_id"`
}

func (w YearRollover) Apply(ctx context.Context, tx *Store, in Inputs, p Proposal, _ uuid.UUID, trace *Trace) (json.RawMessage, string, error) {
	source, _ := parseID(in["source_year"])
	label := strings.TrimSpace(in["label"])
	start, _ := parseDate(in["start_date"])
	end, _ := parseDate(in["end_date"])

	var year uuid.UUID
	if err := trace.Run(stepByKey(w, "create_year"), func() (string, error) {
		var err error
		year, err = tx.createYear(ctx, label, start, end)
		return "Created " + label, err
	}); err != nil {
		return nil, "", err
	}
	if err := trace.Run(stepByKey(w, "copy_terms"), func() (string, error) {
		rows := p.Section("terms").Rows
		for i, r := range rows {
			ts, _ := parseDate(r.Cells["start"])
			te, _ := parseDate(r.Cells["end"])
			if err := tx.createTerm(ctx, year, r.Cells["name"], ts, te, int32(i)); err != nil {
				return "", err
			}
		}
		return plural(len(rows), "term", "terms"), nil
	}); err != nil {
		return nil, "", err
	}
	created := 0
	if err := trace.Run(stepByKey(w, "copy_classes"), func() (string, error) {
		include := map[string]bool{}
		for _, r := range p.Section("classes").Rows {
			include[r.ID] = r.Cells["include"] == "true"
		}
		classes, err := tx.yearClasses(ctx, source)
		if err != nil {
			return "", err
		}
		for _, c := range classes {
			if !include[c.ID.String()] {
				continue
			}
			if in["copy_form_teachers"] != "true" {
				c.FormTeacherID = nil
			}
			if _, err := tx.createClass(ctx, year, c); err != nil {
				return "", fmt.Errorf("class %s: %w", c.Name, err)
			}
			created++
		}
		return plural(created, "class", "classes"), nil
	}); err != nil {
		return nil, "", err
	}
	if in["copy_timetable_setup"] == "true" {
		if err := trace.Run(stepByKey(w, "copy_timetable_setup"), func() (string, error) {
			n, err := tx.copyTimetableSetup(ctx, source, year)
			return fmt.Sprintf("%d grade sections, %d subject hour rows, %d section heads", n.Sections, n.SubjectHours, n.SectionHeads), err
		}); err != nil {
			return nil, "", err
		}
	}
	snapshot, _ := json.Marshal(rolloverSnapshot{YearID: year})
	return snapshot, fmt.Sprintf("Created %s with %s", label, plural(created, "class", "classes")), nil
}

var errYearInUse = errors.New("the new year already has students, attendance, subject choices or timetables, so it can no longer be reverted")

func (YearRollover) Revert(ctx context.Context, tx *Store, snapshot json.RawMessage) error {
	var snap rolloverSnapshot
	if err := json.Unmarshal(snapshot, &snap); err != nil {
		return err
	}
	used, err := tx.yearHasActivity(ctx, snap.YearID)
	if err != nil {
		return err
	}
	if used {
		return errYearInUse
	}
	return tx.deleteYear(ctx, snap.YearID)
}
