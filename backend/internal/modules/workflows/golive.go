package workflows

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/authz"
	"github.com/openschool-org/openschool/internal/modules/notifications"
)

// GoLive (W8) makes the prepared year current and tells the school.
type GoLive struct {
	notices *notifications.NotificationService
}

func NewGoLive(notices *notifications.NotificationService) GoLive { return GoLive{notices: notices} }

func (GoLive) Key() string   { return "go_live" }
func (GoLive) Title() string { return "Go live" }
func (GoLive) Description() string {
	return "Makes the new year and its first term current, so every page switches to it, and sends one notice to the school."
}

func (GoLive) Steps() []StepInfo {
	return []StepInfo{
		{Key: "check_readiness", Title: "Count classes, students and timetables", Tool: ToolCheckYearReadiness, Phase: "propose"},
		{Key: "set_current", Title: "Make the year and first term current", Tool: ToolSetCurrentYear, Phase: "apply"},
		{Key: "notify", Title: "Tell the school", Tool: ToolNotifySchool, Phase: "apply"},
	}
}

func (GoLive) Inputs(ctx context.Context, s *Store) ([]InputField, error) {
	years, err := s.years(ctx)
	if err != nil {
		return nil, err
	}
	fields := []InputField{
		{Key: "target_year", Label: "Year to make current", Type: "select", Required: true, Options: yearOptions(years)},
		{Key: "notify", Label: "Send a notice to everyone", Type: "boolean", Default: "true"},
	}
	// Years are newest first, so the first non-current one is the year being prepared.
	for _, y := range years {
		if !y.Current {
			fields[0].Default = y.ID.String()
			break
		}
	}
	return fields, nil
}

func (GoLive) Check(ctx context.Context, s *Store, in Inputs) ([]Check, error) {
	target, ok := parseID(in["target_year"])
	var year Year
	var r Readiness
	if ok {
		var err error
		if year, err = s.year(ctx, target); err != nil {
			ok = false
		} else if r, err = s.readiness(ctx, target); err != nil {
			return nil, err
		}
	}
	return []Check{
		{Key: "not_current", Title: "The year exists and is not current yet", OK: ok && !year.Current, Blocking: true},
		{Key: "classes", Title: "The year has classes", OK: r.Classes > 0, Blocking: true, FixPath: "/year-end/year_rollover", Detail: plural(int(r.Classes), "class", "classes")},
		{Key: "students", Title: "Students are placed in classes", OK: r.Students > 0, FixPath: "/year-end/promotion", Detail: plural(int(r.Students), "student", "students") + " placed"},
		{Key: "timetables", Title: "Every class has a published timetable", OK: r.Classes > 0 && r.PublishedTimetables >= r.Classes, FixPath: "/timetables", Detail: fmt.Sprintf("%d of %d published", r.PublishedTimetables, r.Classes)},
		{Key: "terms", Title: "The year has terms", OK: r.Terms > 0, FixPath: "/academic-years", Detail: plural(int(r.Terms), "term", "terms")},
	}, nil
}

func (w GoLive) Propose(ctx context.Context, s *Store, in Inputs, trace *Trace) (Proposal, string, error) {
	target, _ := parseID(in["target_year"])
	var year Year
	var r Readiness
	var terms []TermInfo
	var current *Year
	if err := trace.Run(stepByKey(w, "check_readiness"), func() (string, error) {
		var err error
		if year, err = s.year(ctx, target); err != nil {
			return "", err
		}
		if r, err = s.readiness(ctx, target); err != nil {
			return "", err
		}
		if terms, err = s.terms(ctx, target); err != nil {
			return "", err
		}
		years, err := s.years(ctx)
		current = currentYear(years)
		return fmt.Sprintf("%d classes, %d students, %d published timetables", r.Classes, r.Students, r.PublishedTimetables), err
	}); err != nil {
		return Proposal{}, "", err
	}
	from := "None"
	if current != nil {
		from = current.Label
	}
	firstTerm := "None"
	if len(terms) > 0 {
		firstTerm = terms[0].Name
	}
	p := Proposal{
		Summary: []Stat{{Label: "Classes", Value: strconv.Itoa(int(r.Classes))}, {Label: "Students placed", Value: strconv.Itoa(int(r.Students))}, {Label: "Timetables published", Value: fmt.Sprintf("%d of %d", r.PublishedTimetables, r.Classes)}},
		Sections: []Section{{Key: "changes", Title: "What changes", Columns: []Column{{Key: "what", Label: "Setting", Type: "text"}, {Key: "from", Label: "Now", Type: "text"}, {Key: "to", Label: "After", Type: "text"}},
			Rows: []Row{
				{ID: "year", Cells: map[string]string{"what": "Current academic year", "from": from, "to": year.Label}},
				{ID: "term", Cells: map[string]string{"what": "Current term", "from": "-", "to": firstTerm}},
				{ID: "notice", Cells: map[string]string{"what": "Notice to everyone", "from": "-", "to": map[bool]string{true: "Sent", false: "Not sent"}[in["notify"] == "true"]}},
			}}},
	}
	if r.PublishedTimetables < r.Classes {
		p.Warnings = append(p.Warnings, fmt.Sprintf("%d classes have no published timetable yet; teachers and students will see an empty timetable.", r.Classes-r.PublishedTimetables))
	}
	return p, "golive:" + target.String(), nil
}

type goLiveSnapshot struct {
	PreviousYear *uuid.UUID `json:"previous_year"`
	PreviousTerm *uuid.UUID `json:"previous_term"`
}

func (w GoLive) Apply(ctx context.Context, tx *Store, in Inputs, _ Proposal, _ uuid.UUID, trace *Trace) (json.RawMessage, string, error) {
	target, _ := parseID(in["target_year"])
	var snap goLiveSnapshot
	var label string
	if err := trace.Run(stepByKey(w, "set_current"), func() (string, error) {
		years, err := tx.years(ctx)
		if err != nil {
			return "", err
		}
		if cur := currentYear(years); cur != nil {
			snap.PreviousYear = &cur.ID
		}
		if snap.PreviousTerm, err = tx.currentTerm(ctx); err != nil {
			return "", err
		}
		year, err := tx.year(ctx, target)
		if err != nil {
			return "", err
		}
		label = year.Label
		if err := tx.setCurrentYear(ctx, target); err != nil {
			return "", err
		}
		terms, err := tx.terms(ctx, target)
		if err != nil {
			return "", err
		}
		if len(terms) > 0 {
			if err := tx.setCurrentTerm(ctx, terms[0].ID); err != nil {
				return "", err
			}
		}
		return label + " is now current", nil
	}); err != nil {
		return nil, "", err
	}
	data, _ := json.Marshal(snap)
	return data, label + " is now the current year", nil
}

// AfterApply sends the notice once the switch has committed; a failure never undoes the switch.
func (w GoLive) AfterApply(ctx context.Context, s *Store, in Inputs, actor uuid.UUID) error {
	if in["notify"] != "true" || w.notices == nil {
		return nil
	}
	target, _ := parseID(in["target_year"])
	year, err := s.year(ctx, target)
	if err != nil {
		return err
	}
	_, err = w.notices.Create(ctx, notifications.CreateNotificationRequest{
		Title:          "The " + year.Label + " school year has started",
		Message:        "Classes and timetables for " + year.Label + " are now live in OpenSchool.",
		Category:       "general",
		Priority:       "normal",
		RecipientRules: []notifications.RecipientRule{{Type: notifications.RuleEveryone, Label: "Everyone"}},
	}, actor, authz.RoleAdmin)
	return err
}

func (GoLive) Revert(ctx context.Context, tx *Store, snapshot json.RawMessage) error {
	var snap goLiveSnapshot
	if err := json.Unmarshal(snapshot, &snap); err != nil {
		return err
	}
	if snap.PreviousYear != nil {
		if err := tx.setCurrentYear(ctx, *snap.PreviousYear); err != nil {
			return err
		}
	}
	if snap.PreviousTerm != nil {
		return tx.setCurrentTerm(ctx, *snap.PreviousTerm)
	}
	return nil
}
