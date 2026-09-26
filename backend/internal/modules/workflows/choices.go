package workflows

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"strings"

	"github.com/google/uuid"
)

// SubjectChoices (W3) records each student's subjects for next year in one curriculum level
// (O/L baskets, or one A/L stream), so Promotion can group classes by choice. Staff enter the
// choices in the table or from a CSV of the paper forms; basket rules are enforced on apply.
type SubjectChoices struct{}

func (SubjectChoices) Key() string   { return "subject_choices" }
func (SubjectChoices) Title() string { return "Subject choices" }
func (SubjectChoices) Description() string {
	return "Records next year's subject choices for one curriculum level, such as the O/L baskets or one A/L stream. Enter them in the table or import the paper forms as a CSV; each group's rules are checked before saving."
}

var (
	ToolReadCurriculum = tool("read_curriculum", "Reads a level's selection groups with their subjects and how many a student must pick.", false)
	ToolSaveChoices    = tool("save_subject_choices", "Replaces each student's subjects in the level for next year and locks them, so the portal cannot change them.", true)
)

func (SubjectChoices) Steps() []StepInfo {
	return []StepInfo{
		{Key: "read_curriculum", Title: "Read the level's subject groups", Tool: ToolReadCurriculum, Phase: "propose"},
		{Key: "read_students", Title: "Read students moving into the grade", Tool: ToolReadStudents, Phase: "propose"},
		{Key: "read_choices", Title: "Read choices already recorded and the CSV", Tool: ToolReadChoices, Phase: "propose"},
		{Key: "save_choices", Title: "Save choices", Tool: ToolSaveChoices, Phase: "apply"},
	}
}

func normalise(v string) string { return strings.Join(strings.Fields(strings.ToLower(v)), " ") }

func (SubjectChoices) Inputs(ctx context.Context, s *Store) ([]InputField, error) {
	years, err := s.years(ctx)
	if err != nil {
		return nil, err
	}
	levels, err := s.gradeLevels(ctx)
	if err != nil {
		return nil, err
	}
	withChoice, err := s.gradesWithChoice(ctx)
	if err != nil {
		return nil, err
	}
	levelOptions := make([]Option, len(levels))
	for i, l := range levels {
		levelOptions[i] = Option{Value: l.ID.String(), Label: l.GradeName + ": " + l.Label}
	}
	fields := []InputField{
		{Key: "source_year", Label: "From year", Type: "select", Required: true, Options: yearOptions(years)},
		{Key: "target_year", Label: "Choices for year", Type: "select", Required: true, Options: yearOptions(years), Help: "Create it first with Year rollover."},
		{Key: "level", Label: "Curriculum level", Type: "select", Required: true, Options: levelOptions, Help: "For A/L, run once per stream."},
		{Key: "csv", Label: "Choices CSV (optional)", Type: "csv", Template: "index_number,level,subjects\n2026/0101,,Subject one;Subject two;Subject three\n",
			Help: "Subjects by name or code, separated by ;. Leave level blank or use the level's name; rows for other levels are ignored."},
		{Key: "lock", Label: "Lock saved choices so students cannot change them in the portal", Type: "boolean", Default: "true"},
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
	for _, l := range levels {
		if withChoice[l.GradeID] {
			fields[2].Default = l.ID.String()
			break
		}
	}
	return fields, nil
}

func (w SubjectChoices) Check(ctx context.Context, s *Store, in Inputs) ([]Check, error) {
	source, okS := parseID(in["source_year"])
	target, okT := parseID(in["target_year"])
	validYears := okS && okT && source != target
	if validYears {
		if _, err := s.year(ctx, source); err != nil {
			validYears = false
		} else if _, err := s.year(ctx, target); err != nil {
			validYears = false
		}
	}
	checks := []Check{{Key: "years", Title: "Two different years are chosen", OK: validYears, Blocking: true, FixPath: "/year-end/year_rollover"}}
	level, groups, err := w.level(ctx, s, in)
	if err != nil {
		return nil, err
	}
	checks = append(checks, Check{Key: "level", Title: "The level has subject groups", OK: level != nil && len(groups) > 0, Blocking: true, FixPath: "/curriculum",
		Detail: plural(len(groups), "group", "groups")})
	if in["csv"] != "" {
		_, err := parseChoicesCSV(in["csv"])
		detail := ""
		if err != nil {
			detail = err.Error()
		}
		checks = append(checks, Check{Key: "csv", Title: "The CSV can be read", OK: err == nil, Blocking: true, Detail: detail})
	}
	if validYears && level != nil {
		classes, err := s.yearClasses(ctx, target)
		if err != nil {
			return nil, err
		}
		n := 0
		for _, c := range classes {
			if c.GradeID == level.GradeID {
				n++
			}
		}
		checks = append(checks, Check{Key: "classes", Title: "Next year has classes for " + level.GradeName, OK: n > 0, FixPath: "/year-end/year_rollover",
			Detail: "Choices can be saved without classes; Promotion needs them to place students."})
	}
	return checks, nil
}

func (SubjectChoices) level(ctx context.Context, s *Store, in Inputs) (*LevelInfo, []ChoiceGroup, error) {
	id, ok := parseID(in["level"])
	if !ok {
		return nil, nil, nil
	}
	levels, err := s.gradeLevels(ctx)
	if err != nil {
		return nil, nil, err
	}
	for i := range levels {
		if levels[i].ID == id {
			groups, err := s.levelGroups(ctx, id)
			return &levels[i], groups, err
		}
	}
	return nil, nil, nil
}

type choiceRecord struct {
	line     int
	level    string
	subjects []string
}

func parseChoicesCSV(text string) (map[string]choiceRecord, error) {
	r := csv.NewReader(strings.NewReader(strings.TrimPrefix(text, "\ufeff")))
	r.FieldsPerRecord = -1
	r.TrimLeadingSpace = true
	records, err := r.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("the CSV could not be read: %w", err)
	}
	if len(records) == 0 {
		return nil, fmt.Errorf("the CSV is empty")
	}
	col := map[string]int{}
	for i, h := range records[0] {
		col[strings.ReplaceAll(normalise(h), " ", "_")] = i
	}
	idx, okIdx := col["index_number"]
	subj, okSubj := col["subjects"]
	if !okIdx || !okSubj {
		return nil, fmt.Errorf("the header needs index_number and subjects columns")
	}
	lvl, hasLevel := col["level"]
	out := map[string]choiceRecord{}
	for n, rec := range records[1:] {
		get := func(i int) string {
			if i < len(rec) {
				return strings.TrimSpace(rec[i])
			}
			return ""
		}
		index := get(idx)
		if index == "" {
			continue
		}
		c := choiceRecord{line: n + 2}
		if hasLevel {
			c.level = get(lvl)
		}
		for _, part := range strings.FieldsFunc(get(subj), func(r rune) bool { return r == ';' || r == '|' }) {
			if p := strings.TrimSpace(part); p != "" {
				c.subjects = append(c.subjects, p)
			}
		}
		out[index] = c
	}
	return out, nil
}

func slotKey(g uuid.UUID, n int) string { return "g:" + g.String() + ":" + strconv.Itoa(n) }

// choiceColumns gives one select per pick a student makes; groups with nothing to choose get none.
func choiceColumns(groups []ChoiceGroup) []Column {
	var out []Column
	for _, g := range groups {
		if g.Fixed() {
			continue
		}
		for n := 1; n <= g.Max; n++ {
			label := g.Label
			if g.Max > 1 {
				label += " " + strconv.Itoa(n)
			}
			if n > g.Min {
				label += " (optional)"
			}
			out = append(out, Column{Key: slotKey(g.ID, n), Label: label, Type: "select", Editable: true, Options: g.Subjects})
		}
	}
	return out
}

// fillSlots puts subjects into the first free slot of the group that offers them; leftovers are returned.
func fillSlots(groups []ChoiceGroup, cells map[string]string, subjects []uuid.UUID) []uuid.UUID {
	var left []uuid.UUID
	for _, sid := range subjects {
		placed := false
		for _, g := range groups {
			if g.Fixed() || !offers(g, sid) {
				continue
			}
			for n := 1; n <= g.Max && !placed; n++ {
				k := slotKey(g.ID, n)
				if cells[k] == sid.String() {
					placed = true
				} else if cells[k] == "" {
					cells[k] = sid.String()
					placed = true
				}
			}
			if placed {
				break
			}
		}
		if !placed {
			left = append(left, sid)
		}
	}
	return left
}

func offers(g ChoiceGroup, sid uuid.UUID) bool {
	for _, o := range g.Subjects {
		if o.Value == sid.String() {
			return true
		}
	}
	return false
}

// picksFromCells reads the choice slots of a row; empty means the student has no choice yet.
func picksFromCells(groups []ChoiceGroup, cells map[string]string) map[uuid.UUID][]string {
	out := map[uuid.UUID][]string{}
	for _, g := range groups {
		if g.Fixed() {
			continue
		}
		for n := 1; n <= g.Max; n++ {
			if v := cells[slotKey(g.ID, n)]; v != "" {
				out[g.ID] = append(out[g.ID], v)
			}
		}
	}
	return out
}

// choiceProblems checks one student's picks against each group's rules, in plain words.
func choiceProblems(groups []ChoiceGroup, picks map[uuid.UUID][]string) []string {
	var out []string
	taken := map[string]string{}
	for _, g := range groups {
		if g.Fixed() {
			continue
		}
		names := map[string]string{}
		for _, o := range g.Subjects {
			names[o.Value] = o.Label
		}
		for _, v := range picks[g.ID] {
			if names[v] == "" {
				out = append(out, g.Label+": a subject is not offered in this group")
				continue
			}
			if other, dup := taken[v]; dup {
				out = append(out, fmt.Sprintf("%s is picked twice (%s and %s)", names[v], other, g.Label))
			}
			taken[v] = g.Label
		}
		if n := len(picks[g.ID]); n < g.Min || n > g.Max {
			want := strconv.Itoa(g.Min)
			if g.Min != g.Max {
				want = fmt.Sprintf("%d to %d", g.Min, g.Max)
			}
			out = append(out, fmt.Sprintf("%s needs %s, has %d", g.Label, want, n))
		}
	}
	return out
}

func (w SubjectChoices) Propose(ctx context.Context, s *Store, in Inputs, trace *Trace) (Proposal, string, error) {
	source, _ := parseID(in["source_year"])
	target, _ := parseID(in["target_year"])
	var level *LevelInfo
	var groups []ChoiceGroup
	var siblings int
	if err := trace.Run(stepByKey(w, "read_curriculum"), func() (string, error) {
		var err error
		if level, groups, err = w.level(ctx, s, in); err != nil {
			return "", err
		}
		if level == nil {
			return "", fmt.Errorf("%w: unknown level", ErrInvalidProposal)
		}
		levels, err := s.gradeLevels(ctx)
		for _, l := range levels {
			if l.GradeID == level.GradeID {
				siblings++
			}
		}
		return fmt.Sprintf("%s, %s", level.Label, plural(len(groups), "group", "groups")), err
	}); err != nil {
		return Proposal{}, "", err
	}

	var students []PromotionCandidate
	if err := trace.Run(stepByKey(w, "read_students"), func() (string, error) {
		grades, err := s.grades(ctx)
		if err != nil {
			return "", err
		}
		next := nextGrades(grades)
		current, err := s.promotionStudents(ctx, source)
		if err != nil {
			return "", err
		}
		for _, c := range current {
			if g := next[c.FromGradeID]; g != nil && g.ID == level.GradeID {
				students = append(students, c)
			}
		}
		intake, err := s.intakeStudents(ctx, target)
		if err != nil {
			return "", err
		}
		for _, c := range intake {
			if *c.IntakeGradeID == level.GradeID {
				students = append(students, c)
			}
		}
		sort.SliceStable(students, func(i, j int) bool { return students[i].Name < students[j].Name })
		return fmt.Sprintf("%s moving into %s", plural(len(students), "student", "students"), level.GradeName), nil
	}); err != nil {
		return Proposal{}, "", err
	}

	ids := make([]uuid.UUID, len(students))
	for i, st := range students {
		ids[i] = st.ID
	}
	var rows []Row
	var complete, missing, elsewhere, lockedCount int
	if err := trace.Run(stepByKey(w, "read_choices"), func() (string, error) {
		existing, err := s.yearEnrollments(ctx, target, ids)
		if err != nil {
			return "", err
		}
		locked, err := s.lockedStudents(ctx, target, level.ID, ids)
		if err != nil {
			return "", err
		}
		fromCSV := map[string]choiceRecord{}
		if in["csv"] != "" {
			if fromCSV, err = parseChoicesCSV(in["csv"]); err != nil {
				return "", err
			}
		}
		here, other := map[uuid.UUID][]uuid.UUID{}, map[uuid.UUID]bool{}
		for _, e := range existing {
			if e.LevelID == level.ID {
				here[e.StudentID] = append(here[e.StudentID], e.SubjectID)
			} else {
				other[e.StudentID] = true
			}
		}
		codes := map[string]uuid.UUID{}
		for _, g := range groups {
			for k, v := range g.Codes {
				codes[k] = v
			}
		}
		for _, st := range students {
			if other[st.ID] && len(here[st.ID]) == 0 {
				elsewhere++
				continue
			}
			cells := map[string]string{"index": st.Index, "name": st.Name, "from": st.ClassName, "medium": st.MediumID}
			include := siblings == 1 || len(here[st.ID]) > 0
			reason := "No choice recorded yet."
			var warning string
			fillSlots(groups, cells, here[st.ID])
			if len(here[st.ID]) > 0 {
				reason = "Choice already recorded."
			}
			if rec, ok := fromCSV[st.Index]; ok && (rec.level == "" || normalise(rec.level) == normalise(level.Label)) {
				include = true
				reason = fmt.Sprintf("From the CSV, line %d.", rec.line)
				for _, c := range choiceColumns(groups) {
					cells[c.Key] = ""
				}
				var subjects []uuid.UUID
				var unknown []string
				for _, name := range rec.subjects {
					if id, ok := codes[normalise(name)]; ok {
						subjects = append(subjects, id)
					} else {
						unknown = append(unknown, name)
					}
				}
				if left := fillSlots(groups, cells, subjects); len(left) > 0 {
					warning = fmt.Sprintf("%s did not fit the groups' limits.", plural(len(left), "subject", "subjects"))
				}
				if len(unknown) > 0 {
					warning = "Not offered in this level: " + strings.Join(unknown, ", ") + "."
				}
			}
			picks := picksFromCells(groups, cells)
			if warning == "" && len(picks) > 0 {
				if problems := choiceProblems(groups, picks); len(problems) > 0 {
					warning = strings.Join(problems, "; ") + "."
				}
			}
			if locked[st.ID] {
				lockedCount++
				reason += " Locked in the portal; saving here replaces it."
			}
			if len(picks) > 0 && warning == "" {
				complete++
			} else if include {
				missing++
			}
			cells["include"] = strconv.FormatBool(include)
			rows = append(rows, Row{ID: st.ID.String(), Group: st.ClassName, Reason: reason, Warning: warning, Cells: cells})
		}
		return fmt.Sprintf("%d complete, %d still to enter", complete, missing), nil
	}); err != nil {
		return Proposal{}, "", err
	}

	columns := []Column{{Key: "from", Label: "Now in", Type: "text"}, {Key: "index", Label: "Index no.", Type: "text"}, {Key: "name", Label: "Name", Type: "text"},
		{Key: "include", Label: "In " + level.Label, Type: "boolean", Editable: true}}
	columns = append(columns, choiceColumns(groups)...)
	var fixed []string
	for _, g := range groups {
		if g.Fixed() {
			for _, o := range g.Subjects {
				fixed = append(fixed, o.Label)
			}
		}
	}
	description := "Pick each student's subjects. Only ticked students with a choice are saved; students left blank keep what they had."
	if len(fixed) > 0 {
		description += " Everyone also takes " + strings.Join(fixed, ", ") + "."
	}
	p := Proposal{
		Summary: []Stat{
			{Label: "Level", Value: level.GradeName + ": " + level.Label},
			{Label: "Students", Value: strconv.Itoa(len(rows))},
			{Label: "Choice complete", Value: strconv.Itoa(complete)},
			{Label: "Still to enter", Value: strconv.Itoa(missing)},
			{Label: "In another stream", Value: strconv.Itoa(elsewhere)},
			{Label: "Locked in the portal", Value: strconv.Itoa(lockedCount)},
		},
		Sections: []Section{{Key: "choices", Title: "Choices", Description: description, Columns: columns, Rows: rows}},
	}
	if missing > 0 {
		p.Warnings = append(p.Warnings, fmt.Sprintf("%s have no complete choice yet. Fill them in here, or save now and finish later.", plural(missing, "student", "students")))
	}
	if siblings > 1 {
		p.Warnings = append(p.Warnings, fmt.Sprintf("%s has %d levels. Tick the students in %s; run again for each other stream.", level.GradeName, siblings, level.Label))
	}
	return p, "subject_choices:" + target.String() + ":" + level.ID.String(), nil
}

type choicesSnapshot struct {
	Year     uuid.UUID    `json:"year"`
	Level    uuid.UUID    `json:"level"`
	Students []uuid.UUID  `json:"students"`
	Previous []Enrollment `json:"previous"`
	Locked   []uuid.UUID  `json:"locked"`
}

func (w SubjectChoices) Apply(ctx context.Context, tx *Store, in Inputs, p Proposal, _ uuid.UUID, trace *Trace) (json.RawMessage, string, error) {
	target, _ := parseID(in["target_year"])
	level, groups, err := w.level(ctx, tx, in)
	if err != nil {
		return nil, "", err
	}
	if level == nil {
		return nil, "", fmt.Errorf("%w: unknown level", ErrInvalidProposal)
	}
	snap := choicesSnapshot{Year: target, Level: level.ID}
	var rows []Enrollment
	if err := trace.Run(stepByKey(w, "save_choices"), func() (string, error) {
		for _, r := range p.Section("choices").Rows {
			sid, ok := parseID(r.ID)
			if !ok || r.Cells["include"] != "true" {
				continue
			}
			picks := picksFromCells(groups, r.Cells)
			if len(picks) == 0 {
				continue
			}
			if problems := choiceProblems(groups, picks); len(problems) > 0 {
				return "", fmt.Errorf("%w: %s: %s", ErrInvalidProposal, r.Cells["name"], strings.Join(problems, "; "))
			}
			medium := optionalID(r.Cells["medium"])
			for _, g := range groups {
				subjects := picks[g.ID]
				if g.Fixed() {
					subjects = nil
					for _, o := range g.Subjects {
						subjects = append(subjects, o.Value)
					}
				}
				for _, v := range subjects {
					subject, _ := parseID(v)
					rows = append(rows, Enrollment{StudentID: sid, GroupID: g.ID, SubjectID: subject, MediumID: medium, LevelID: level.ID})
				}
			}
			snap.Students = append(snap.Students, sid)
		}
		var err error
		if snap.Previous, err = tx.yearEnrollments(ctx, target, snap.Students); err != nil {
			return "", err
		}
		locked, err := tx.lockedStudents(ctx, target, level.ID, snap.Students)
		if err != nil {
			return "", err
		}
		for id := range locked {
			snap.Locked = append(snap.Locked, id)
		}
		if err := tx.replaceLevelEnrollments(ctx, target, level.ID, snap.Students, rows); err != nil {
			return "", err
		}
		if in["lock"] == "true" {
			if err := tx.setLocks(ctx, target, level.ID, snap.Students, snap.Students); err != nil {
				return "", err
			}
		}
		return fmt.Sprintf("%s saved", plural(len(snap.Students), "student's choice", "students' choices")), nil
	}); err != nil {
		return nil, "", err
	}
	data, _ := json.Marshal(snap)
	return data, fmt.Sprintf("Saved %s subjects for %s", level.Label, plural(len(snap.Students), "student", "students")), nil
}

func (SubjectChoices) Revert(ctx context.Context, tx *Store, snapshot json.RawMessage) error {
	var snap choicesSnapshot
	if err := json.Unmarshal(snapshot, &snap); err != nil {
		return err
	}
	used, err := tx.studentsHaveMarks(ctx, snap.Year, snap.Students)
	if err != nil {
		return err
	}
	if used {
		return errChoicesInUse
	}
	var previous []Enrollment
	for _, e := range snap.Previous {
		if e.LevelID == snap.Level {
			previous = append(previous, e)
		}
	}
	if err := tx.replaceLevelEnrollments(ctx, snap.Year, snap.Level, snap.Students, previous); err != nil {
		return err
	}
	return tx.setLocks(ctx, snap.Year, snap.Level, snap.Students, snap.Locked)
}
