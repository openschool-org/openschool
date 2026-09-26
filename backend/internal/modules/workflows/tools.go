package workflows

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

// Tools lists every backend operation the workflows use. Each StepInfo names one of these,
// and the catalogue returns them, so the frontend never describes an agent by hand.
var Tools = map[string]ToolInfo{}

func tool(name, description string, mutates bool) string {
	Tools[name] = ToolInfo{Name: name, Description: description, Mutates: mutates}
	return name
}

var (
	ToolReadYears          = tool("read_academic_years", "Reads academic years, their dates and which one is current.", false)
	ToolReadClasses        = tool("read_classes", "Reads a year's classes with grade, stream, medium, homeroom, capacity and student count.", false)
	ToolReadTerms          = tool("read_terms", "Reads a year's terms in order.", false)
	ToolReadStudents       = tool("read_students", "Reads active students with their class, grade, gender, house and medium.", false)
	ToolReadChoices        = tool("read_subject_choices", "Reads each student's subject enrolments for the target year and the stream of the level they chose.", false)
	ToolReadPolicies       = tool("read_promotion_policies", "Reads the promotion rule for each grade move (keep section, reshuffle, by subject choice, by stream, graduate).", false)
	ToolPlaceStudents      = tool("place_students", "Deterministic placement engine: gives every student a class by the grade move's rule, class capacity and medium, with a reason for each.", false)
	ToolPlanNewClasses     = tool("plan_new_classes", "Works out extra sections a grade needs when its students do not fit the existing classes.", false)
	ToolCreateYear         = tool("create_academic_year", "Creates an academic year that is not yet current.", true)
	ToolCopyTerms          = tool("copy_terms", "Copies term names into the new year, moving the dates forward by whole years.", true)
	ToolCopyClasses        = tool("copy_classes", "Creates the new year's classes with the same grade, stream, medium, capacity and homeroom.", true)
	ToolCopyTimetableSetup = tool("copy_timetable_setup", "Copies grade sections, period grids, subject hours, timetable settings and section heads.", true)
	ToolMarkLeavers        = tool("mark_leavers", "Marks students as left with a leaving date; starts the PDPA retention clock.", true)
	ToolCreateClasses      = tool("create_classes", "Creates the extra sections the placement needs, each with a homeroom.", true)
	ToolAssignClasses      = tool("assign_classes", "Writes each student's class for the target year, replacing any earlier assignment for that year.", true)
	ToolSetCurrentYear     = tool("set_current_year", "Makes the target year and its first term current; exactly one year stays current (ADR 0003).", true)
	ToolNotifySchool       = tool("notify_school", "Sends one in-app notice to everyone that the new year is live.", true)
	ToolSavePolicies       = tool("save_promotion_rules", "Remembers the rule chosen for each grade move, so next year starts from it.", true)
	ToolCheckYearReadiness = tool("check_year_readiness", "Counts classes, placed students, published timetables and terms for a year.", false)
)

// ---- Input helpers shared by the definitions ----

func yearOptions(years []Year) []Option {
	out := make([]Option, len(years))
	for i, y := range years {
		label := y.Label
		if y.Current {
			label += " (current)"
		}
		out[i] = Option{Value: y.ID.String(), Label: label}
	}
	return out
}

func currentYear(years []Year) *Year {
	for i := range years {
		if years[i].Current {
			return &years[i]
		}
	}
	return nil
}

func parseID(v string) (uuid.UUID, bool) {
	id, err := uuid.Parse(v)
	return id, err == nil
}

func parseDate(v string) (time.Time, bool) {
	t, err := time.Parse("2006-01-02", v)
	return t, err == nil
}

func parseIDs(v string) []uuid.UUID {
	var out []uuid.UUID
	for _, part := range strings.Split(v, ",") {
		if id, ok := parseID(strings.TrimSpace(part)); ok {
			out = append(out, id)
		}
	}
	return out
}

// nextLabel turns "2026" into "2027"; anything else is left for the person to type.
func nextLabel(label string) string {
	if n, err := strconv.Atoi(strings.TrimSpace(label)); err == nil {
		return strconv.Itoa(n + 1)
	}
	return ""
}

func fmtDate(t time.Time) string { return t.Format("2006-01-02") }

func plural(n int, one, many string) string {
	if n == 1 {
		return fmt.Sprintf("%d %s", n, one)
	}
	return fmt.Sprintf("%d %s", n, many)
}

// afterApplier is implemented by workflows that do something outside the transaction once it commits.
type afterApplier interface {
	AfterApply(ctx context.Context, s *Store, in Inputs, actor uuid.UUID) error
}
