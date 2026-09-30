package workflows

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/names"
)

// StudentImport loads existing students into this year's classes in one go, for a school starting on OpenSchool.
// Unlike Intake it needs no coming year and no Promotion: each row names its class.
type StudentImport struct{}

func (StudentImport) Key() string   { return "student_import" }
func (StudentImport) Title() string { return "Import students" }
func (StudentImport) Group() string { return GroupSetup }
func (StudentImport) Description() string {
	return "Adds many students and their guardians at once and puts each one into a class for the current year. Nothing is saved until you review the preview and apply it, and an import can be undone."
}

var (
	ToolReadImportCSV  = tool("read_import_csv", "Reads the student CSV and checks every row: required fields, class, phone numbers, gender, duplicates by index number and guardian NIC.", false)
	ToolImportStudents = tool("import_students", "Creates the students and guardians, links siblings to the same guardian and places each student in their class.", true)
	importColumns      = []string{"class", "index_number", "full_name", "name_with_initials", "calling_name", "gender", "address", "phone", "guardian_name", "guardian_relationship", "guardian_phone", "guardian_nic", "guardian_email"}
	importTemplate     = strings.Join(importColumns, ",") + "\n6-A,2026/0001,Hettiwatta Arachchige Nimali Perera,,Nimali,female,\"12 Temple Road, Kandy\",0771234567,H.A. Sunil Perera,father,0712345678,197512345678,\n6-A,2026/0002,Hettiwatta Arachchige Kasun Perera,H.A.K. Perera,,male,\"12 Temple Road, Kandy\",,H.A. Sunil Perera,father,0712345678,197512345678,\n"
)

func (StudentImport) Steps() []StepInfo {
	return []StepInfo{
		{Key: "read_csv", Title: "Read and check the CSV", Tool: ToolReadImportCSV, Phase: "propose"},
		{Key: "import_students", Title: "Create students and place them in classes", Tool: ToolImportStudents, Phase: "apply"},
	}
}

func (StudentImport) Inputs(context.Context, *Store) ([]InputField, error) {
	return []InputField{{Key: "csv", Label: "Students CSV", Type: "csv", Required: true, Template: importTemplate,
		Help: "One row per student. The class column uses the class name, such as 6-A. name_with_initials (like H.A.N. Perera) is filled in from the full name when left blank; calling_name is optional. Siblings share a guardian NIC, so they are linked to one guardian. In Excel, format the phone and NIC columns as Text before typing, or Excel shortens long numbers."}}, nil
}

func (StudentImport) Check(ctx context.Context, s *Store, in Inputs) ([]Check, error) {
	years, err := s.years(ctx)
	if err != nil {
		return nil, err
	}
	year := currentYear(years)
	var classes []YearClass
	if year != nil {
		if classes, err = s.yearClasses(ctx, year.ID); err != nil {
			return nil, err
		}
	}
	rows, csvErr := parseStudentCSV(in["csv"], importColumns)
	detail := plural(len(rows), "row", "rows")
	if csvErr != nil {
		detail = csvErr.Error()
	}
	yearDetail := ""
	if year != nil {
		yearDetail = year.Label
	}
	return []Check{
		{Key: "year", Title: "A current academic year is set", OK: year != nil, Blocking: true, FixPath: "/academic-years", Detail: yearDetail},
		{Key: "classes", Title: "The current year has classes", OK: len(classes) > 0, Blocking: true, FixPath: "/classes", Detail: plural(len(classes), "class", "classes")},
		{Key: "csv", Title: "The CSV has a header and at least one student", OK: csvErr == nil && len(rows) > 0, Blocking: true, Detail: detail},
	}, nil
}

// classKey ignores case, spaces, dashes and a leading "grade", so "6-A", "6A" and "Grade 6 A" all match.
func classKey(v string) string {
	v = strings.ToLower(v)
	v = strings.TrimPrefix(strings.TrimSpace(v), "grade")
	return strings.NewReplacer(" ", "", "-", "", "_", "", "/", "").Replace(v)
}

func classLabel(c YearClass) string { return c.GradeName + " · " + c.Name }

func (w StudentImport) Propose(ctx context.Context, s *Store, in Inputs, trace *Trace) (Proposal, string, error) {
	years, err := s.years(ctx)
	if err != nil {
		return Proposal{}, "", err
	}
	year := currentYear(years)
	if year == nil {
		return Proposal{}, "", fmt.Errorf("%w: set a current academic year first", ErrInvalidProposal)
	}
	var rows []Row
	var classOptions []Option
	var warnings []string
	var toImport, withErrors, noClass, reused, siblings, notedRows int
	if err := trace.Run(stepByKey(w, "read_csv"), func() (string, error) {
		records, err := parseStudentCSV(in["csv"], importColumns)
		if err != nil {
			return "", err
		}
		classes, err := s.yearClasses(ctx, year.ID)
		if err != nil {
			return "", err
		}
		byKey := map[string][]YearClass{}
		for _, c := range classes {
			classOptions = append(classOptions, Option{Value: c.ID.String(), Label: classLabel(c)})
			byKey[classKey(c.Name)] = append(byKey[classKey(c.Name)], c)
			if k := classKey(c.GradeName + c.Name); k != classKey(c.Name) {
				byKey[k] = append(byKey[k], c)
			}
		}
		schoolType, err := s.schoolType(ctx)
		if err != nil {
			return "", err
		}
		var numbers, nics []string
		for _, r := range records {
			numbers = append(numbers, r.fields["index_number"])
			nics = append(nics, strings.ToUpper(r.fields["guardian_nic"]))
		}
		taken, err := s.existingIndexNumbers(ctx, numbers)
		if err != nil {
			return "", err
		}
		known, err := s.guardiansByNIC(ctx, nics)
		if err != nil {
			return "", err
		}
		var phones, emails []string
		for _, r := range records {
			if v := r.fields["guardian_phone"]; v != "" {
				phones = append(phones, v)
			}
			if v := strings.ToLower(r.fields["guardian_email"]); v != "" {
				emails = append(emails, v)
			}
		}
		onRecord, emailOwners, err := s.existingContacts(ctx, phones, emails)
		if err != nil {
			return "", err
		}
		seenIndex := map[string]int{}
		seenNIC := map[string]string{}
		placed := map[uuid.UUID]int{}
		guardians := newGuardianChecker()
		guardians.seed(onRecord, emailOwners)
		for _, r := range records {
			f := r.fields
			nic := strings.ToUpper(f["guardian_nic"])
			var withInitials, calling string
			f["full_name"], withInitials, calling = names.Normalize(f["full_name"], f["name_with_initials"], f["calling_name"])
			problem := rowProblem(f, schoolType)
			if problem == "" && taken[f["index_number"]] {
				problem = "Index number " + f["index_number"] + " already belongs to a student on record."
			}
			if line, dup := seenIndex[f["index_number"]]; problem == "" && dup {
				problem = fmt.Sprintf("Same index number as line %d.", line)
			}
			seenIndex[f["index_number"]] = r.line

			var guardianNotes []string
			if problem == "" && nic != "" {
				var onRecord *guardianSeen
				if g, ok := known[nic]; ok {
					onRecord = &guardianSeen{name: g.FullName, email: g.Email}
				}
				problem, guardianNotes = guardians.check(guardianSeen{line: r.line, nic: nic, name: f["guardian_name"], email: f["guardian_email"], phone: f["guardian_phone"]}, onRecord)
				if len(guardianNotes) > 0 {
					notedRows++
				}
			}

			matches := byKey[classKey(f["class"])]
			classID, reason := "", "New student."
			switch {
			case f["class"] == "":
				reason = "No class given: choose one, then tick Import."
			case len(matches) == 0:
				reason = fmt.Sprintf("Class %q is not set up for %s: choose a class, then tick Import.", f["class"], year.Label)
			case len(matches) > 1:
				reason = fmt.Sprintf("Class %q matches more than one grade: choose the right one, then tick Import.", f["class"])
			default:
				classID = matches[0].ID.String()
			}
			switch {
			case !hasGuardian(f):
				reason += " No guardian given; add one from the student's page."
			case known[nic].FullName != "":
				reason += " Guardian " + known[nic].FullName + " is already on record, so this student is linked to them, not added again."
				if known[nic].HasLogin {
					reason += " They have a login, so this child appears in their parent portal."
				}
				if problem == "" {
					reused++
				}
			case seenNIC[nic] != "":
				reason += " Sibling of " + seenNIC[nic] + ": linked to the same guardian."
				if problem == "" {
					siblings++
				}
			}
			if nic != "" && seenNIC[nic] == "" {
				seenNIC[nic] = f["full_name"]
			}
			if len(guardianNotes) > 0 {
				reason += " " + strings.Join(guardianNotes, " ")
			}

			importIt := problem == "" && classID != ""
			switch {
			case problem != "":
				withErrors++
			case classID == "":
				noClass++
			default:
				toImport++
				placed[matches[0].ID]++
			}
			rows = append(rows, Row{ID: "line:" + strconv.Itoa(r.line), Reason: strings.TrimSpace(reason), Warning: problem,
				Cells: map[string]string{
					"line": strconv.Itoa(r.line), "class": classID, "index": f["index_number"], "name": f["full_name"], "gender": strings.ToLower(f["gender"]),
					"name_with_initials": withInitials, "calling_name": calling,
					"guardian": f["guardian_name"], "guardian_nic": nic, "import": strconv.FormatBool(importIt), "error": problem,
					"address": f["address"], "phone": f["phone"], "relationship": strings.ToLower(f["guardian_relationship"]),
					"guardian_phone": f["guardian_phone"], "guardian_email": f["guardian_email"],
				}})
		}
		for _, c := range classes {
			if n := placed[c.ID]; n > 0 && c.Capacity > 0 && int(c.Students)+n > int(c.Capacity) {
				warnings = append(warnings, fmt.Sprintf("%s will have %d students, above its capacity of %d.", classLabel(c), int(c.Students)+n, c.Capacity))
			}
		}
		return fmt.Sprintf("%d rows, %d ready, %d need a class, %d with problems", len(records), toImport, noClass, withErrors), nil
	}); err != nil {
		return Proposal{}, "", err
	}
	p := Proposal{
		Summary: []Stat{
			{Label: "Rows read", Value: strconv.Itoa(len(rows))},
			{Label: "Ready to import", Value: strconv.Itoa(toImport)},
			{Label: "Need a class", Value: strconv.Itoa(noClass)},
			{Label: "With problems", Value: strconv.Itoa(withErrors)},
			{Label: "Guardians already on record", Value: strconv.Itoa(reused)},
			{Label: "Siblings in this file", Value: strconv.Itoa(siblings)},
		},
		Sections: []Section{{Key: "students", Title: "Students", Description: "Ticked rows are imported into the class shown. Rows with a problem cannot be ticked: fix the CSV and run again.", Columns: []Column{
			{Key: "line", Label: "Line", Type: "number"}, {Key: "class", Label: "Class", Type: "select", Editable: true, Options: classOptions},
			{Key: "index", Label: "Index no.", Type: "text"}, {Key: "name_with_initials", Label: "Name with initials", Type: "text"}, {Key: "name", Label: "Full name", Type: "text"}, {Key: "gender", Label: "Gender", Type: "text"},
			{Key: "guardian", Label: "Guardian", Type: "text"}, {Key: "guardian_nic", Label: "Guardian NIC", Type: "text"},
			{Key: "import", Label: "Import", Type: "boolean", Editable: true},
		}, Rows: rows}},
		Warnings: warnings,
	}
	if withErrors > 0 {
		p.Warnings = append(p.Warnings, fmt.Sprintf("%s have problems and will be skipped. Fix them in the CSV and run the import again.", plural(withErrors, "row", "rows")))
	}
	if notedRows > 0 {
		p.Warnings = append(p.Warnings, fmt.Sprintf("%s have guardian details to review, such as one parent under two NICs or a shared email. See each row's note.", plural(notedRows, "row", "rows")))
	}
	if noClass > 0 {
		p.Warnings = append(p.Warnings, fmt.Sprintf("%s need a class. Choose one in the Class column and tick Import, or fix the CSV.", plural(noClass, "row", "rows")))
	}
	return p, "student_import:" + year.ID.String(), nil
}

type importSnapshot struct {
	Year      uuid.UUID   `json:"year"`
	Students  []uuid.UUID `json:"students"`
	Guardians []uuid.UUID `json:"guardians"`
}

func (w StudentImport) Apply(ctx context.Context, tx *Store, _ Inputs, p Proposal, _ uuid.UUID, trace *Trace) (json.RawMessage, string, error) {
	years, err := tx.years(ctx)
	if err != nil {
		return nil, "", err
	}
	year := currentYear(years)
	if year == nil {
		return nil, "", fmt.Errorf("%w: there is no current academic year", ErrInvalidProposal)
	}
	snap := importSnapshot{Year: year.ID}
	if err := trace.Run(stepByKey(w, "import_students"), func() (string, error) {
		classes, err := tx.yearClasses(ctx, year.ID)
		if err != nil {
			return "", err
		}
		valid := map[uuid.UUID]bool{}
		for _, c := range classes {
			valid[c.ID] = true
		}
		var ticked []Row
		var numbers, nics []string
		for _, r := range p.Section("students").Rows {
			if r.Cells["import"] != "true" {
				continue
			}
			if r.Cells["error"] != "" {
				return "", fmt.Errorf("%w: line %s: %s", ErrInvalidProposal, r.Cells["line"], r.Cells["error"])
			}
			// An edited class must still be one of this year's classes.
			if id, ok := parseID(r.Cells["class"]); !ok || !valid[id] {
				return "", fmt.Errorf("%w: line %s: choose a class for the current year", ErrInvalidProposal, r.Cells["line"])
			}
			ticked = append(ticked, r)
			numbers = append(numbers, r.Cells["index"])
			nics = append(nics, r.Cells["guardian_nic"])
		}
		taken, err := tx.existingIndexNumbers(ctx, numbers)
		if err != nil {
			return "", err
		}
		known, err := tx.guardiansByNIC(ctx, nics)
		if err != nil {
			return "", err
		}
		guardianByNIC := map[string]uuid.UUID{}
		for nic, g := range known {
			guardianByNIC[nic] = g.ID
		}
		ids, guardians, err := createStudentRows(ctx, tx, ticked, taken, guardianByNIC)
		if err != nil {
			return "", err
		}
		snap.Students, snap.Guardians = ids, guardians
		assignments := make([]Assignment, len(ids))
		for i, r := range ticked {
			classID, _ := parseID(r.Cells["class"])
			assignments[i] = Assignment{StudentID: ids[i], ClassID: classID}
		}
		if err := tx.reassign(ctx, year.ID, nil, assignments); err != nil {
			return "", err
		}
		return fmt.Sprintf("%d students, %d new guardians", len(ids), len(guardians)), nil
	}); err != nil {
		return nil, "", err
	}
	data, _ := json.Marshal(snap)
	return data, fmt.Sprintf("Imported %s into their classes with %s. Next: issue activation codes in Settings > Account activation.",
		plural(len(snap.Students), "student", "students"), plural(len(snap.Guardians), "new guardian", "new guardians")), nil
}

// Revert removes this import's own class places first, so only later work (accounts, subjects, attendance, marks) blocks an undo.
func (StudentImport) Revert(ctx context.Context, tx *Store, snapshot json.RawMessage) error {
	var snap importSnapshot
	if err := json.Unmarshal(snapshot, &snap); err != nil {
		return err
	}
	if err := tx.reassign(ctx, snap.Year, snap.Students, nil); err != nil {
		return err
	}
	used, err := tx.studentsInUse(ctx, snap.Students)
	if err != nil {
		return err
	}
	if used {
		return errStudentsInUse
	}
	return tx.deleteImported(ctx, snap.Students, snap.Guardians)
}
