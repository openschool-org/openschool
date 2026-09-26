package workflows

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"log"
	"regexp"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/authz"
	"github.com/openschool-org/openschool/internal/idp"
	"github.com/openschool-org/openschool/internal/validation"
)

// StudentIntake (W4) imports new students and their guardians from a CSV and queues them for a grade
// in the coming year. Promotion (W5) then places them in classes with everyone else.
type StudentIntake struct{ provider idp.Provider }

// NewStudentIntake takes the identity provider used to create sign-in accounts after the import commits; nil skips accounts.
func NewStudentIntake(provider idp.Provider) StudentIntake { return StudentIntake{provider: provider} }

func (StudentIntake) Key() string   { return "intake" }
func (StudentIntake) Title() string { return "Intake" }
func (StudentIntake) Description() string {
	return "Imports new students and their guardians from a CSV (grade 6 scholarship, grade 10 or A/L intake). Duplicates are caught by index number and guardian NIC. Promotion then places them in classes."
}

var (
	ToolReadIntakeCSV     = tool("read_intake_csv", "Reads the intake CSV and checks every row: required fields, phone numbers, gender, medium, duplicates by index number and guardian NIC.", false)
	ToolCreateStudents    = tool("create_students", "Creates the student profiles and guardians, links siblings to the same guardian and queues each student for the chosen grade.", true)
	ToolCreateAccounts    = tool("create_student_accounts", "After the import commits, creates a sign-in account for each imported student with an email. The index number is the first password.", true)
	intakeColumns         = []string{"index_number", "full_name", "gender", "medium", "address", "phone", "email", "guardian_name", "guardian_relationship", "guardian_phone", "guardian_nic", "guardian_email"}
	intakeTemplate        = strings.Join(intakeColumns, ",") + "\n2027/0001,Nimali Perera,female,Sinhala,\"12 Temple Road, Kandy\",0771234567,,Sunil Perera,father,0712345678,197512345678,\n"
	emailPattern          = regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[^@\s]+$`)
	nicPattern            = regexp.MustCompile(`^(\d{9}[VvXx]|\d{12})$`)
	guardianRelationships = map[string]bool{"father": true, "mother": true, "guardian": true, "other": true}
)

func (StudentIntake) Steps() []StepInfo {
	return []StepInfo{
		{Key: "read_csv", Title: "Read and check the CSV", Tool: ToolReadIntakeCSV, Phase: "propose"},
		{Key: "create_students", Title: "Create students and guardians", Tool: ToolCreateStudents, Phase: "apply"},
		{Key: "create_accounts", Title: "Create sign-in accounts", Tool: ToolCreateAccounts, Phase: "apply"},
	}
}

func (StudentIntake) Inputs(ctx context.Context, s *Store) ([]InputField, error) {
	years, err := s.years(ctx)
	if err != nil {
		return nil, err
	}
	grades, err := s.grades(ctx)
	if err != nil {
		return nil, err
	}
	mediums, err := s.mediums(ctx)
	if err != nil {
		return nil, err
	}
	gradeOptions := make([]Option, len(grades))
	for i, g := range grades {
		gradeOptions[i] = Option{Value: g.ID.String(), Label: g.Name}
	}
	mediumOptions := make([]Option, len(mediums))
	for i, m := range mediums {
		mediumOptions[i] = Option{Value: m.ID.String(), Label: m.Name}
	}
	fields := []InputField{
		{Key: "target_year", Label: "Joining in year", Type: "select", Required: true, Options: yearOptions(years), Help: "Usually next year, created with Year rollover."},
		{Key: "grade", Label: "Joining grade", Type: "select", Required: true, Options: gradeOptions},
		{Key: "medium", Label: "Medium when the CSV leaves it blank", Type: "select", Options: mediumOptions},
		{Key: "csv", Label: "Students CSV", Type: "csv", Required: true, Template: intakeTemplate,
			Help: "One row per student. Download the template for the columns. Siblings share a guardian NIC."},
		{Key: "create_accounts", Label: "Create sign-in accounts for students with an email", Type: "boolean", Default: "false"},
	}
	if cur := currentYear(years); cur != nil {
		fields[0].Default = cur.ID.String()
		for _, y := range years {
			if !y.Current && y.Start.After(cur.Start) {
				fields[0].Default = y.ID.String()
				break
			}
		}
	}
	return fields, nil
}

func (StudentIntake) Check(ctx context.Context, s *Store, in Inputs) ([]Check, error) {
	year, okYear := parseID(in["target_year"])
	if okYear {
		if _, err := s.year(ctx, year); err != nil {
			okYear = false
		}
	}
	_, okGrade := parseID(in["grade"])
	rows, err := parseIntakeCSV(in["csv"])
	csvOK := err == nil && len(rows) > 0
	detail := plural(len(rows), "row", "rows")
	if err != nil {
		detail = err.Error()
	}
	return []Check{
		{Key: "year", Title: "The joining year is chosen", OK: okYear, Blocking: true, FixPath: "/year-end/year_rollover"},
		{Key: "grade", Title: "The joining grade is chosen", OK: okGrade, Blocking: true},
		{Key: "csv", Title: "The CSV has a header and at least one student", OK: csvOK, Blocking: true, Detail: detail},
	}, nil
}

// intakeRow is one CSV line keyed by column name.
type intakeRow struct {
	line   int
	fields map[string]string
}

func parseIntakeCSV(text string) ([]intakeRow, error) {
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
	header := make([]string, len(records[0]))
	known := map[string]bool{}
	for _, c := range intakeColumns {
		known[c] = true
	}
	for i, h := range records[0] {
		header[i] = strings.ToLower(strings.TrimSpace(strings.ReplaceAll(h, " ", "_")))
	}
	for _, required := range []string{"index_number", "full_name"} {
		if !strings.Contains(","+strings.Join(header, ",")+",", ","+required+",") {
			return nil, fmt.Errorf("the header has no %s column", required)
		}
	}
	var out []intakeRow
	for n, rec := range records[1:] {
		row := intakeRow{line: n + 2, fields: map[string]string{}}
		empty := true
		for i, v := range rec {
			if i < len(header) && known[header[i]] {
				row.fields[header[i]] = strings.TrimSpace(v)
				if row.fields[header[i]] != "" {
					empty = false
				}
			}
		}
		if !empty {
			out = append(out, row)
		}
	}
	return out, nil
}

// rowProblem returns why a row cannot be imported, or "".
func rowProblem(f map[string]string, schoolType string) string {
	var problems []string
	if f["index_number"] == "" {
		problems = append(problems, "index number is missing")
	}
	if f["full_name"] == "" {
		problems = append(problems, "name is missing")
	}
	gender := strings.ToLower(f["gender"])
	switch {
	case gender != "" && gender != "male" && gender != "female":
		problems = append(problems, "gender must be male or female")
	case schoolType == "boys" && gender == "female", schoolType == "girls" && gender == "male":
		problems = append(problems, "gender does not match a "+schoolType+" school")
	}
	if !validation.IsValidSriLankanPhone(f["phone"]) {
		problems = append(problems, "phone is not a Sri Lankan number")
	}
	if f["email"] != "" && !emailPattern.MatchString(f["email"]) {
		problems = append(problems, "email is not valid")
	}
	if hasGuardian(f) {
		if f["guardian_name"] == "" || f["guardian_phone"] == "" || f["guardian_nic"] == "" {
			problems = append(problems, "guardian needs a name, phone and NIC")
		}
		if !guardianRelationships[strings.ToLower(f["guardian_relationship"])] {
			problems = append(problems, "guardian relationship must be father, mother, guardian or other")
		}
		if f["guardian_phone"] != "" && !validation.IsValidSriLankanPhone(f["guardian_phone"]) {
			problems = append(problems, "guardian phone is not a Sri Lankan number")
		}
		if f["guardian_nic"] != "" && !nicPattern.MatchString(f["guardian_nic"]) {
			problems = append(problems, "guardian NIC must be 9 digits and V or X, or 12 digits")
		}
		if f["guardian_email"] != "" && !emailPattern.MatchString(f["guardian_email"]) {
			problems = append(problems, "guardian email is not valid")
		}
	}
	if len(problems) == 0 {
		return ""
	}
	return strings.ToUpper(problems[0][:1]) + strings.Join(problems, "; ")[1:] + "."
}

func hasGuardian(f map[string]string) bool {
	return f["guardian_name"] != "" || f["guardian_phone"] != "" || f["guardian_nic"] != "" || f["guardian_relationship"] != ""
}

func (w StudentIntake) Propose(ctx context.Context, s *Store, in Inputs, trace *Trace) (Proposal, string, error) {
	year, _ := parseID(in["target_year"])
	grade, _ := parseID(in["grade"])
	var rows []Row
	var toImport, withErrors, reused, siblings int
	var mediumOptions []Option
	if err := trace.Run(stepByKey(w, "read_csv"), func() (string, error) {
		records, err := parseIntakeCSV(in["csv"])
		if err != nil {
			return "", err
		}
		mediums, err := s.mediums(ctx)
		if err != nil {
			return "", err
		}
		mediumByName := map[string]string{}
		for _, m := range mediums {
			mediumByName[strings.ToLower(m.Name)] = m.ID.String()
			mediumOptions = append(mediumOptions, Option{Value: m.ID.String(), Label: m.Name})
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
		seenIndex := map[string]int{}
		seenNIC := map[string]string{}
		for _, r := range records {
			f := r.fields
			nic := strings.ToUpper(f["guardian_nic"])
			problem := rowProblem(f, schoolType)
			medium := in["medium"]
			if f["medium"] != "" {
				if id, ok := mediumByName[strings.ToLower(f["medium"])]; ok {
					medium = id
				} else if problem == "" {
					problem = fmt.Sprintf("Medium %q is not set up in School settings.", f["medium"])
				}
			}
			if problem == "" && taken[f["index_number"]] {
				problem = "Index number " + f["index_number"] + " already belongs to a student on record."
			}
			if line, dup := seenIndex[f["index_number"]]; problem == "" && dup {
				problem = fmt.Sprintf("Same index number as line %d.", line)
			}
			seenIndex[f["index_number"]] = r.line
			reason := "New student."
			switch {
			case !hasGuardian(f):
				reason = "New student. No guardian given; add one from the student's page."
			case known[nic].FullName != "":
				reason = "Guardian " + known[nic].FullName + " is already on record, so this student is linked to them."
				if problem == "" {
					reused++
				}
			case seenNIC[nic] != "":
				reason = "Sibling of " + seenNIC[nic] + ": linked to the same guardian."
				if problem == "" {
					siblings++
				}
			}
			if nic != "" && seenNIC[nic] == "" {
				seenNIC[nic] = f["full_name"]
			}
			importIt := problem == ""
			if importIt {
				toImport++
			} else {
				withErrors++
			}
			rows = append(rows, Row{ID: "line:" + strconv.Itoa(r.line), Reason: reason, Warning: problem,
				Cells: map[string]string{
					"line": strconv.Itoa(r.line), "index": f["index_number"], "name": f["full_name"], "gender": strings.ToLower(f["gender"]),
					"medium": medium, "guardian": f["guardian_name"], "guardian_nic": nic, "import": strconv.FormatBool(importIt), "error": problem,
					"address": f["address"], "phone": f["phone"], "email": f["email"], "relationship": strings.ToLower(f["guardian_relationship"]),
					"guardian_phone": f["guardian_phone"], "guardian_email": f["guardian_email"],
				}})
		}
		return fmt.Sprintf("%d rows, %d ready, %d with problems", len(records), toImport, withErrors), nil
	}); err != nil {
		return Proposal{}, "", err
	}
	p := Proposal{
		Summary: []Stat{
			{Label: "Rows read", Value: strconv.Itoa(len(rows))},
			{Label: "Ready to import", Value: strconv.Itoa(toImport)},
			{Label: "With problems", Value: strconv.Itoa(withErrors)},
			{Label: "Guardians already on record", Value: strconv.Itoa(reused)},
			{Label: "Siblings in this file", Value: strconv.Itoa(siblings)},
		},
		Sections: []Section{{Key: "students", Title: "Students", Description: "Ticked rows are imported. Rows with a problem cannot be ticked: fix the CSV and run again.", Columns: []Column{
			{Key: "line", Label: "Line", Type: "number"}, {Key: "index", Label: "Index no.", Type: "text"}, {Key: "name", Label: "Name", Type: "text"},
			{Key: "gender", Label: "Gender", Type: "text"}, {Key: "medium", Label: "Medium", Type: "select", Editable: true, Options: mediumOptions},
			{Key: "guardian", Label: "Guardian", Type: "text"}, {Key: "guardian_nic", Label: "Guardian NIC", Type: "text"},
			{Key: "import", Label: "Import", Type: "boolean", Editable: true},
		}, Rows: rows}},
	}
	if withErrors > 0 {
		p.Warnings = append(p.Warnings, fmt.Sprintf("%s have problems and will be skipped. Fix them in the CSV and run the intake again.", plural(withErrors, "row", "rows")))
	}
	return p, "intake:" + year.String() + ":" + grade.String(), nil
}

type intakeSnapshot struct {
	Students  []uuid.UUID `json:"students"`
	Guardians []uuid.UUID `json:"guardians"`
}

func (w StudentIntake) Apply(ctx context.Context, tx *Store, in Inputs, p Proposal, _ uuid.UUID, trace *Trace) (json.RawMessage, string, error) {
	year, _ := parseID(in["target_year"])
	grade, _ := parseID(in["grade"])
	var snap intakeSnapshot
	linked := 0
	if err := trace.Run(stepByKey(w, "create_students"), func() (string, error) {
		var ticked []Row
		var numbers, nics []string
		for _, r := range p.Section("students").Rows {
			if r.Cells["import"] != "true" {
				continue
			}
			if r.Cells["error"] != "" {
				return "", fmt.Errorf("%w: line %s: %s", ErrInvalidProposal, r.Cells["line"], r.Cells["error"])
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
		for _, r := range ticked {
			c := r.Cells
			if taken[c["index"]] {
				return "", fmt.Errorf("%w: line %s: index number %s was added since the proposal; run the intake again", ErrInvalidProposal, c["line"], c["index"])
			}
			st := NewStudent{Name: c["name"], Index: c["index"], Gender: c["gender"], Address: c["address"], Phone: c["phone"],
				GuardianName: c["guardian"], Relationship: c["relationship"], GuardianPhone: c["guardian_phone"], GuardianNIC: c["guardian_nic"], GuardianEmail: c["guardian_email"]}
			id, err := tx.createIntakeStudent(ctx, st)
			if err != nil {
				return "", fmt.Errorf("line %s: %w", c["line"], err)
			}
			snap.Students = append(snap.Students, id)
			if st.GuardianNIC != "" {
				gid, ok := guardianByNIC[st.GuardianNIC]
				if !ok {
					if gid, err = tx.createGuardian(ctx, st); err != nil {
						return "", fmt.Errorf("line %s guardian: %w", c["line"], err)
					}
					guardianByNIC[st.GuardianNIC] = gid
					snap.Guardians = append(snap.Guardians, gid)
				}
				if err := tx.linkGuardian(ctx, id, gid); err != nil {
					return "", err
				}
				linked++
			}
			if err := tx.createIntake(ctx, Intake{StudentID: id, YearID: year, GradeID: grade, MediumID: optionalID(c["medium"])}); err != nil {
				return "", err
			}
		}
		return fmt.Sprintf("%d students, %d new guardians", len(snap.Students), len(snap.Guardians)), nil
	}); err != nil {
		return nil, "", err
	}
	data, _ := json.Marshal(snap)
	return data, fmt.Sprintf("Imported %s with %s", plural(len(snap.Students), "student", "students"), plural(len(snap.Guardians), "new guardian", "new guardians")), nil
}

// AfterApply creates sign-in accounts outside the transaction, one student at a time; a failure
// leaves that student without an account, which can be added later from the Students page.
func (w StudentIntake) AfterApply(ctx context.Context, s *Store, in Inputs, _ uuid.UUID) error {
	if in["create_accounts"] != "true" || w.provider == nil {
		return nil
	}
	records, err := parseIntakeCSV(in["csv"])
	if err != nil {
		return err
	}
	emails := map[string]string{}
	var numbers []string
	for _, r := range records {
		if r.fields["email"] != "" {
			emails[r.fields["index_number"]] = r.fields["email"]
			numbers = append(numbers, r.fields["index_number"])
		}
	}
	pending, err := s.studentsWithoutAccount(ctx, numbers)
	if err != nil {
		return err
	}
	for _, st := range pending {
		if err := w.createAccount(ctx, s, st.ID, st.IndexNumber, st.FullName, emails[st.IndexNumber]); err != nil {
			log.Printf("intake: account for %s: %v", st.IndexNumber, err)
		}
	}
	return nil
}

func (w StudentIntake) createAccount(ctx context.Context, s *Store, student uuid.UUID, index, name, email string) error {
	given, family := name, ""
	if i := strings.LastIndex(name, " "); i > 0 {
		given, family = name[:i], name[i+1:]
	}
	user, err := w.provider.CreateUser(ctx, authz.RoleStudent, map[string]any{"username": index, "email": email, "given_name": given, "family_name": family, "password": index})
	if err != nil {
		return err
	}
	uid, err := uuid.Parse(user.ID)
	if err != nil {
		_ = w.provider.DeleteUser(ctx, user.ID)
		return err
	}
	if err := s.createStudentUser(ctx, uid, email, name); err != nil {
		_ = w.provider.DeleteUser(ctx, user.ID)
		return err
	}
	if err := w.provider.AssignRole(ctx, idp.RoleID(authz.RoleStudent), user.ID); err != nil {
		_ = w.provider.DeleteUser(ctx, user.ID)
		_ = s.deleteUser(ctx, uid)
		return err
	}
	return s.setStudentUser(ctx, student, uid)
}

func (StudentIntake) Revert(ctx context.Context, tx *Store, snapshot json.RawMessage) error {
	var snap intakeSnapshot
	if err := json.Unmarshal(snapshot, &snap); err != nil {
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
