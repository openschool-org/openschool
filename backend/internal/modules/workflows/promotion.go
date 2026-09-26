package workflows

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"strings"

	"github.com/google/uuid"
)

// Promotion (W5) moves every student into next year's class by the rule set for their grade
// move, places admitted students with them, and adds sections where classes are full.
type Promotion struct{}

func (Promotion) Key() string   { return "promotion" }
func (Promotion) Title() string { return "Promotion and class formation" }
func (Promotion) Description() string {
	return "Places every student in next year's class by the rule for their grade: keep the section, reshuffle, group by subject choice or by A/L stream. New admissions are placed too, and full grades get extra sections."
}

func (Promotion) Steps() []StepInfo {
	return []StepInfo{
		{Key: "read_students", Title: "Read students and new admissions", Tool: ToolReadStudents, Phase: "propose"},
		{Key: "read_choices", Title: "Read next year's subject choices", Tool: ToolReadChoices, Phase: "propose"},
		{Key: "read_policies", Title: "Read the rule for each grade", Tool: ToolReadPolicies, Phase: "propose"},
		{Key: "read_classes", Title: "Read next year's classes and free seats", Tool: ToolReadClasses, Phase: "propose"},
		{Key: "place", Title: "Place students", Tool: ToolPlaceStudents, Phase: "propose"},
		{Key: "create_classes", Title: "Create the extra sections", Tool: ToolCreateClasses, Phase: "apply"},
		{Key: "assign_classes", Title: "Assign next year's classes", Tool: ToolAssignClasses, Phase: "apply"},
		{Key: "save_policies", Title: "Remember the rules", Tool: ToolSavePolicies, Phase: "apply"},
	}
}

var policyOptions = []Option{
	{Value: PolicyKeepSection, Label: policyLabels[PolicyKeepSection]},
	{Value: PolicyBalanced, Label: policyLabels[PolicyBalanced]},
	{Value: PolicyBySubjectChoice, Label: policyLabels[PolicyBySubjectChoice]},
	{Value: PolicyByStream, Label: policyLabels[PolicyByStream]},
	{Value: PolicyGraduate, Label: policyLabels[PolicyGraduate]},
}

func policyKey(grade uuid.UUID) string { return "policy:" + grade.String() }

// defaultPolicy uses the stored rule, else infers one from the curriculum of the grade students move into.
func defaultPolicy(stored map[uuid.UUID]PolicySetting, from GradeInfo, next *GradeInfo, withChoice, withStreams map[uuid.UUID]bool) string {
	if p, ok := stored[from.ID]; ok {
		return p.Policy
	}
	switch {
	case next == nil:
		return PolicyGraduate
	case withStreams[next.ID]:
		return PolicyByStream
	case withChoice[next.ID]:
		return PolicyBySubjectChoice
	default:
		return PolicyKeepSection
	}
}

func (Promotion) Inputs(ctx context.Context, s *Store) ([]InputField, error) {
	years, err := s.years(ctx)
	if err != nil {
		return nil, err
	}
	grades, err := s.grades(ctx)
	if err != nil {
		return nil, err
	}
	stored, err := s.policies(ctx)
	if err != nil {
		return nil, err
	}
	withChoice, err := s.gradesWithChoice(ctx)
	if err != nil {
		return nil, err
	}
	withStreams, err := s.gradesWithStreams(ctx)
	if err != nil {
		return nil, err
	}
	fields := []InputField{
		{Key: "source_year", Label: "From year", Type: "select", Required: true, Options: yearOptions(years)},
		{Key: "target_year", Label: "Into year", Type: "select", Required: true, Options: yearOptions(years), Help: "Create it first with Year rollover."},
		{Key: "spread_by_marks", Label: "Spread reshuffled grades by last term's marks", Type: "boolean", Default: "false", Help: "Only affects grades set to reshuffle."},
	}
	if cur := currentYear(years); cur != nil {
		fields[0].Default = cur.ID.String()
		for _, y := range years {
			if !y.Current && y.Start.After(cur.Start) {
				fields[1].Default = y.ID.String()
			}
		}
	}
	for _, p := range stored {
		if p.SpreadByMarks {
			fields[2].Default = "true"
		}
	}
	for i, g := range grades {
		var next *GradeInfo
		label := g.Name + " leaves school"
		if i+1 < len(grades) {
			next = &grades[i+1]
			label = g.Name + " to " + next.Name
		}
		fields = append(fields, InputField{Key: policyKey(g.ID), Label: label, Type: "select", Required: true, Options: policyOptions, Default: defaultPolicy(stored, g, next, withChoice, withStreams)})
	}
	return fields, nil
}

func (w Promotion) Check(ctx context.Context, s *Store, in Inputs) ([]Check, error) {
	source, okS := parseID(in["source_year"])
	target, okT := parseID(in["target_year"])
	var checks []Check
	valid := okS && okT && source != target
	if valid {
		if _, err := s.year(ctx, source); err != nil {
			valid = false
		} else if _, err := s.year(ctx, target); err != nil {
			valid = false
		}
	}
	checks = append(checks, Check{Key: "years", Title: "Two different years are chosen", OK: valid, Blocking: true})
	if !valid {
		return checks, nil
	}
	classes, err := s.yearClasses(ctx, target)
	if err != nil {
		return nil, err
	}
	checks = append(checks, Check{Key: "target_classes", Title: "Next year has classes", OK: len(classes) > 0, Blocking: true, FixPath: "/year-end/year_rollover", Detail: plural(len(classes), "class", "classes")})

	students, err := s.promotionStudents(ctx, source)
	if err != nil {
		return nil, err
	}
	grades, err := s.grades(ctx)
	if err != nil {
		return nil, err
	}
	next := nextGrades(grades)
	graduating, needChoice, needStream := 0, 0, 0
	var choiceIDs, streamIDs []uuid.UUID
	for _, st := range students {
		switch in[policyKey(st.FromGradeID)] {
		case PolicyGraduate:
			graduating++
		case PolicyBySubjectChoice:
			if next[st.FromGradeID] != nil {
				choiceIDs = append(choiceIDs, st.ID)
			}
		case PolicyByStream:
			if next[st.FromGradeID] != nil {
				streamIDs = append(streamIDs, st.ID)
			}
		}
	}
	choices, err := s.studentChoices(ctx, target, append(choiceIDs, streamIDs...))
	if err != nil {
		return nil, err
	}
	for _, id := range choiceIDs {
		if choices[id].Key == "" {
			needChoice++
		}
	}
	for _, id := range streamIDs {
		if choices[id].StreamID == "" {
			needStream++
		}
	}
	checks = append(checks,
		Check{Key: "leavers", Title: "Leavers are marked", OK: graduating == 0, FixPath: "/year-end/leavers", Detail: fmt.Sprintf("%s in leaving grades are still active; they will be listed as leaving, not placed.", plural(graduating, "student", "students"))},
		Check{Key: "choices", Title: "Subject choices are recorded", OK: needChoice == 0, FixPath: "/year-end/subject_choices", Detail: fmt.Sprintf("%s have no choice for next year and will be placed by size only.", plural(needChoice, "student", "students"))},
		Check{Key: "streams", Title: "A/L streams are recorded", OK: needStream == 0, FixPath: "/year-end/subject_choices", Detail: fmt.Sprintf("%s have no stream and will be left for you to place.", plural(needStream, "student", "students"))},
	)
	return checks, nil
}

func nextGrades(grades []GradeInfo) map[uuid.UUID]*GradeInfo {
	out := map[uuid.UUID]*GradeInfo{}
	for i := range grades {
		if i+1 < len(grades) {
			out[grades[i].ID] = &grades[i+1]
		} else {
			out[grades[i].ID] = nil
		}
	}
	return out
}

func previousGrades(grades []GradeInfo) map[uuid.UUID]uuid.UUID {
	out := map[uuid.UUID]uuid.UUID{}
	for i := 1; i < len(grades); i++ {
		out[grades[i].ID] = grades[i-1].ID
	}
	return out
}

// moving is one student with the grade they go into and the rule that places them.
type moving struct {
	PromotionCandidate
	target uuid.UUID
	policy string
}

func (w Promotion) Propose(ctx context.Context, s *Store, in Inputs, trace *Trace) (Proposal, string, error) {
	source, _ := parseID(in["source_year"])
	target, _ := parseID(in["target_year"])
	spread := in["spread_by_marks"] == "true"

	var grades []GradeInfo
	var candidates []PromotionCandidate
	if err := trace.Run(stepByKey(w, "read_students"), func() (string, error) {
		var err error
		if grades, err = s.grades(ctx); err != nil {
			return "", err
		}
		current, err := s.promotionStudents(ctx, source)
		if err != nil {
			return "", err
		}
		intake, err := s.intakeStudents(ctx, target)
		if err != nil {
			return "", err
		}
		candidates = append(current, intake...)
		return fmt.Sprintf("%d current students, %d new admissions", len(current), len(intake)), nil
	}); err != nil {
		return Proposal{}, "", err
	}
	gradeName := map[uuid.UUID]string{}
	for _, g := range grades {
		gradeName[g.ID] = g.Name
	}
	next, prev := nextGrades(grades), previousGrades(grades)

	var movers []moving
	var leaving []PromotionCandidate
	_ = trace.Run(stepByKey(w, "read_policies"), func() (string, error) {
		for _, c := range candidates {
			if c.IntakeGradeID != nil {
				policy := PolicyBalanced
				if from, ok := prev[*c.IntakeGradeID]; ok {
					policy = in[policyKey(from)]
				}
				if policy == PolicyGraduate || policy == PolicyKeepSection {
					policy = PolicyBalanced
				}
				movers = append(movers, moving{PromotionCandidate: c, target: *c.IntakeGradeID, policy: policy})
				continue
			}
			policy := in[policyKey(c.FromGradeID)]
			if policy == PolicyGraduate || next[c.FromGradeID] == nil {
				leaving = append(leaving, c)
				continue
			}
			movers = append(movers, moving{PromotionCandidate: c, target: next[c.FromGradeID].ID, policy: policy})
		}
		return fmt.Sprintf("%d moving up, %d leaving", len(movers), len(leaving)), nil
	})

	ids := make([]uuid.UUID, len(movers))
	for i, m := range movers {
		ids[i] = m.ID
	}
	var choices map[uuid.UUID]StudentChoice
	var averages map[uuid.UUID]float64
	if err := trace.Run(stepByKey(w, "read_choices"), func() (string, error) {
		var err error
		if choices, err = s.studentChoices(ctx, target, ids); err != nil {
			return "", err
		}
		if spread {
			if averages, err = s.latestAverages(ctx, source, ids); err != nil {
				return "", err
			}
		}
		return fmt.Sprintf("%d students have next-year subjects", len(choices)), nil
	}); err != nil {
		return Proposal{}, "", err
	}

	var targetClasses []YearClass
	var occupied map[uuid.UUID]int
	mediumName, streamName := map[string]string{}, map[string]string{}
	if err := trace.Run(stepByKey(w, "read_classes"), func() (string, error) {
		var err error
		if targetClasses, err = s.yearClasses(ctx, target); err != nil {
			return "", err
		}
		if occupied, err = s.targetOccupancy(ctx, target, ids); err != nil {
			return "", err
		}
		sourceClasses, err := s.yearClasses(ctx, source)
		for _, c := range append(targetClasses, sourceClasses...) {
			if c.MediumID != nil {
				mediumName[c.MediumID.String()] = c.MediumName
			}
			if c.StreamID != nil {
				streamName[c.StreamID.String()] = c.StreamName
			}
		}
		return plural(len(targetClasses), "class", "classes") + " next year", err
	}); err != nil {
		return Proposal{}, "", err
	}

	// Place grade by grade, in school order.
	byGrade := map[uuid.UUID][]moving{}
	for _, m := range movers {
		byGrade[m.target] = append(byGrade[m.target], m)
	}
	classesByGrade := map[uuid.UUID][]YearClass{}
	for _, c := range targetClasses {
		classesByGrade[c.GradeID] = append(classesByGrade[c.GradeID], c)
	}
	placements := map[uuid.UUID]Placement{}
	type newClass struct {
		grade uuid.UUID
		class PlacementClass
	}
	var added []newClass
	options := map[uuid.UUID][]Option{}
	planned := map[string]int{}
	_ = trace.Run(stepByKey(w, "place"), func() (string, error) {
		for _, g := range grades {
			group := byGrade[g.ID]
			if len(group) == 0 {
				continue
			}
			var pcs []PlacementClass
			for _, c := range classesByGrade[g.ID] {
				pcs = append(pcs, PlacementClass{ID: c.ID.String(), Name: c.Name, MediumID: idString(c.MediumID), StreamID: idString(c.StreamID), StreamGroupID: idString(c.StreamGroupID), Capacity: int(c.Capacity), Occupied: occupied[c.ID]})
			}
			policy := group[0].policy
			pss := make([]PlacementStudent, len(group))
			for i, m := range group {
				ch := choices[m.ID]
				avg, has := averages[m.ID]
				current := m.ClassName
				if m.IntakeGradeID != nil {
					current = ""
				}
				pss[i] = PlacementStudent{ID: m.ID.String(), Name: m.Name, Gender: m.Gender, HouseID: m.HouseID, CurrentClass: current, MediumID: m.MediumID,
					StreamID: ch.StreamID, StreamGroupID: ch.StreamGroupID, ChoiceKey: ch.Key, ChoiceLabel: ch.Label, Marks: avg, HasMarks: has}
			}
			result, extra := Place(pss, pcs, policy, spread, target.String()+":"+g.ID.String(), defaultCapacity)
			rename := map[string]string{}
			for _, c := range extra {
				id := "new:" + g.ID.String() + ":" + c.Name
				rename[c.ID] = id
				c.ID = id
				added = append(added, newClass{grade: g.ID, class: c})
			}
			for _, p := range result {
				if id, ok := rename[p.ClassID]; ok {
					p.ClassID = id
				}
				sid, _ := uuid.Parse(p.StudentID)
				placements[sid] = p
				planned[p.ClassID]++
			}
			for _, c := range pcs {
				options[g.ID] = append(options[g.ID], Option{Value: c.ID, Label: c.Name})
			}
			for _, nc := range added {
				if nc.grade == g.ID {
					options[g.ID] = append(options[g.ID], Option{Value: nc.class.ID, Label: nc.class.Name + " (new)"})
				}
			}
		}
		return fmt.Sprintf("%d placed, %d new sections", len(placements), len(added)), nil
	})

	// Rows in school order: grade, then name.
	sort.SliceStable(movers, func(i, j int) bool {
		if movers[i].target != movers[j].target {
			return gradeOrder(grades, movers[i].target) < gradeOrder(grades, movers[j].target)
		}
		return movers[i].Name < movers[j].Name
	})
	placeRows := make([]Row, len(movers))
	unplaced := 0
	for i, m := range movers {
		p := placements[m.ID]
		if p.ClassID == "" {
			unplaced++
		}
		placeRows[i] = Row{ID: m.ID.String(), Group: gradeName[m.target], Reason: p.Reason, Warning: p.Warning,
			Options: map[string][]Option{"class": options[m.target]},
			Cells:   map[string]string{"from": m.ClassName, "name": m.Name, "index": m.Index, "to_grade": gradeName[m.target], "class": p.ClassID}}
	}
	newRows := make([]Row, len(added))
	for i, nc := range added {
		stream := streamName[nc.class.StreamID]
		newRows[i] = Row{ID: nc.class.ID, Group: gradeName[nc.grade], Reason: fmt.Sprintf("%d students do not fit the existing classes.", planned[nc.class.ID]),
			Cells: map[string]string{"grade": gradeName[nc.grade], "class": nc.class.Name, "medium": mediumName[nc.class.MediumID], "stream": stream, "capacity": strconv.Itoa(nc.class.Capacity), "create": "true",
				"grade_id": nc.grade.String(), "medium_id": nc.class.MediumID, "stream_id": nc.class.StreamID, "stream_group_id": nc.class.StreamGroupID}}
	}
	leaveRows := make([]Row, len(leaving))
	for i, l := range leaving {
		leaveRows[i] = Row{ID: l.ID.String(), Group: gradeName[l.FromGradeID], Reason: "Leaves school. Mark as left in the Leavers step.",
			Cells: map[string]string{"from": l.ClassName, "name": l.Name, "index": l.Index}}
	}
	var sizeRows []Row
	for _, c := range targetClasses {
		sizeRows = append(sizeRows, Row{ID: c.ID.String(), Group: c.GradeName, Cells: map[string]string{"class": c.Name, "capacity": strconv.Itoa(int(c.Capacity)), "before": strconv.Itoa(occupied[c.ID]), "after": strconv.Itoa(occupied[c.ID] + planned[c.ID.String()])}})
	}

	admissions := 0
	for _, m := range movers {
		if m.IntakeGradeID != nil {
			admissions++
		}
	}
	p := Proposal{
		Summary: []Stat{
			{Label: "Moving up", Value: strconv.Itoa(len(movers) - admissions)},
			{Label: "New admissions", Value: strconv.Itoa(admissions)},
			{Label: "Leaving", Value: strconv.Itoa(len(leaving))},
			{Label: "New sections", Value: strconv.Itoa(len(added))},
			{Label: "Not placed", Value: strconv.Itoa(unplaced)},
		},
		Sections: []Section{
			{Key: "placements", Title: "Placements", Description: "Change any student's class here. Every row says why it was placed there.", Columns: []Column{
				{Key: "from", Label: "Now in", Type: "text"}, {Key: "name", Label: "Name", Type: "text"}, {Key: "index", Label: "Index no.", Type: "text"},
				{Key: "to_grade", Label: "Moves to", Type: "text"}, {Key: "class", Label: "Class", Type: "select", Editable: true},
			}, Rows: placeRows},
			{Key: "new_classes", Title: "Extra sections", Description: "Untick a section to not create it; its students are then left unplaced.", Columns: []Column{
				{Key: "grade", Label: "Grade", Type: "text"}, {Key: "class", Label: "Class", Type: "text"}, {Key: "medium", Label: "Medium", Type: "text"},
				{Key: "stream", Label: "Stream", Type: "text"}, {Key: "capacity", Label: "Capacity", Type: "number"}, {Key: "create", Label: "Create", Type: "boolean", Editable: true},
			}, Rows: newRows},
			{Key: "leaving", Title: "Leaving school", Columns: []Column{{Key: "from", Label: "Class", Type: "text"}, {Key: "name", Label: "Name", Type: "text"}, {Key: "index", Label: "Index no.", Type: "text"}}, Rows: leaveRows},
			{Key: "class_sizes", Title: "Class sizes", Description: "As proposed, before any changes you make above.", Columns: []Column{
				{Key: "class", Label: "Class", Type: "text"}, {Key: "capacity", Label: "Capacity", Type: "number"}, {Key: "before", Label: "Already placed", Type: "number"}, {Key: "after", Label: "After", Type: "number"},
			}, Rows: sizeRows},
		},
	}
	if unplaced > 0 {
		p.Warnings = append(p.Warnings, fmt.Sprintf("%s could not be placed. Pick a class for each by hand or fix their stream first.", plural(unplaced, "student", "students")))
	}
	return p, "promotion:" + target.String(), nil
}

const defaultCapacity = 45

func idString(id *uuid.UUID) string {
	if id == nil {
		return ""
	}
	return id.String()
}

func gradeOrder(grades []GradeInfo, id uuid.UUID) int32 {
	for _, g := range grades {
		if g.ID == id {
			return g.Order
		}
	}
	return 0
}

type promotionSnapshot struct {
	Year     uuid.UUID    `json:"year"`
	Cleared  []uuid.UUID  `json:"cleared"`
	Previous []Assignment `json:"previous"`
	Assigned []uuid.UUID  `json:"assigned_classes"`
	Created  []uuid.UUID  `json:"created_classes"`
	Intakes  []Intake     `json:"intakes"`
}

func optionalID(v string) *uuid.UUID {
	if id, ok := parseID(v); ok {
		return &id
	}
	return nil
}

func (w Promotion) Apply(ctx context.Context, tx *Store, in Inputs, p Proposal, _ uuid.UUID, trace *Trace) (json.RawMessage, string, error) {
	target, _ := parseID(in["target_year"])
	snap := promotionSnapshot{Year: target}
	realID := map[string]uuid.UUID{}

	if err := trace.Run(stepByKey(w, "create_classes"), func() (string, error) {
		for _, r := range p.Section("new_classes").Rows {
			if r.Cells["create"] != "true" {
				continue
			}
			grade, _ := parseID(r.Cells["grade_id"])
			capacity, _ := strconv.Atoi(r.Cells["capacity"])
			id, err := tx.createClass(ctx, target, YearClass{GradeID: grade, Name: r.Cells["class"], MediumID: optionalID(r.Cells["medium_id"]), StreamID: optionalID(r.Cells["stream_id"]), StreamGroupID: optionalID(r.Cells["stream_group_id"]), Capacity: int32(capacity)})
			if err != nil {
				return "", fmt.Errorf("class %s: %w", r.Cells["class"], err)
			}
			realID[r.ID] = id
			snap.Created = append(snap.Created, id)
		}
		return plural(len(snap.Created), "section", "sections") + " created", nil
	}); err != nil {
		return nil, "", err
	}

	var assignments []Assignment
	classSet := map[uuid.UUID]bool{}
	if err := trace.Run(stepByKey(w, "assign_classes"), func() (string, error) {
		for _, r := range p.Section("placements").Rows {
			sid, ok := parseID(r.ID)
			if !ok {
				continue
			}
			snap.Cleared = append(snap.Cleared, sid)
			value := r.Cells["class"]
			var cid uuid.UUID
			if strings.HasPrefix(value, "new:") {
				if cid, ok = realID[value]; !ok {
					continue
				}
			} else if cid, ok = parseID(value); !ok {
				continue
			}
			assignments = append(assignments, Assignment{StudentID: sid, ClassID: cid})
			classSet[cid] = true
		}
		var err error
		if snap.Previous, err = tx.yearAssignments(ctx, target, snap.Cleared); err != nil {
			return "", err
		}
		if err := tx.reassign(ctx, target, snap.Cleared, assignments); err != nil {
			return "", err
		}
		placed := make([]uuid.UUID, len(assignments))
		for i, a := range assignments {
			placed[i] = a.StudentID
		}
		if snap.Intakes, err = tx.intakesByIDs(ctx, placed); err != nil {
			return "", err
		}
		if err := tx.deleteIntakes(ctx, placed); err != nil {
			return "", err
		}
		return fmt.Sprintf("%d students in %d classes", len(assignments), len(classSet)), nil
	}); err != nil {
		return nil, "", err
	}
	for id := range classSet {
		snap.Assigned = append(snap.Assigned, id)
	}

	if err := trace.Run(stepByKey(w, "save_policies"), func() (string, error) {
		saved := 0
		for key, value := range in {
			if grade, ok := strings.CutPrefix(key, "policy:"); ok {
				id, ok := parseID(grade)
				if !ok || policyLabels[value] == "" {
					continue
				}
				if err := tx.savePolicy(ctx, id, PolicySetting{Policy: value, SpreadByMarks: in["spread_by_marks"] == "true"}); err != nil {
					return "", err
				}
				saved++
			}
		}
		return plural(saved, "rule", "rules") + " saved", nil
	}); err != nil {
		return nil, "", err
	}

	data, _ := json.Marshal(snap)
	summary := fmt.Sprintf("Placed %s in %s", plural(len(assignments), "student", "students"), plural(len(classSet), "class", "classes"))
	if len(snap.Created) > 0 {
		summary += fmt.Sprintf(", created %s", plural(len(snap.Created), "section", "sections"))
	}
	return data, summary, nil
}

func (Promotion) Revert(ctx context.Context, tx *Store, snapshot json.RawMessage) error {
	var snap promotionSnapshot
	if err := json.Unmarshal(snapshot, &snap); err != nil {
		return err
	}
	used, err := tx.classesHaveRecords(ctx, snap.Year, append(snap.Assigned, snap.Created...), snap.Cleared)
	if err != nil {
		return err
	}
	if used {
		return errClassesInUse
	}
	if err := tx.reassign(ctx, snap.Year, snap.Cleared, snap.Previous); err != nil {
		return err
	}
	for _, in := range snap.Intakes {
		if err := tx.restoreIntake(ctx, in); err != nil {
			return err
		}
	}
	return tx.deleteEmptyClasses(ctx, snap.Created)
}
