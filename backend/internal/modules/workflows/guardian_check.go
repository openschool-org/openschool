package workflows

import (
	"fmt"
	"strings"

	"github.com/openschool-org/openschool/internal/names"
)

// guardianSeen is a guardian's first row in the file (line > 0), or someone already on record (line 0).
type guardianSeen struct {
	line                    int
	nic, name, email, phone string
	// account marks an email owned by an existing login rather than a guardian record.
	account bool
}

// guardianChecker catches guardian rows that disagree. A NIC is one person, so a NIC with a second name or
// email is blocked: linking a child to the wrong parent would show that child's records to a stranger.
type guardianChecker struct {
	byNIC   map[string]guardianSeen
	byPhone map[string][]guardianSeen
	byEmail map[string]guardianSeen
}

func newGuardianChecker() *guardianChecker {
	return &guardianChecker{byNIC: map[string]guardianSeen{}, byPhone: map[string][]guardianSeen{}, byEmail: map[string]guardianSeen{}}
}

// seed adds guardians and logins already on record, so rows are compared with them as well as with each other.
func (g *guardianChecker) seed(people, emailOwners []guardianSeen) {
	for _, p := range people {
		if p.phone != "" {
			g.byPhone[p.phone] = append(g.byPhone[p.phone], p)
		}
	}
	for _, o := range emailOwners {
		if _, seen := g.byEmail[o.email]; !seen {
			g.byEmail[o.email] = o
		}
	}
}

func (other guardianSeen) where() string {
	if other.line == 0 {
		return "on record"
	}
	return fmt.Sprintf("on line %d", other.line)
}

// check returns a blocking problem (or "") and non-blocking notes for one row's guardian.
// onRecord is the guardian already saved under this NIC, if any.
func (g *guardianChecker) check(row guardianSeen, onRecord *guardianSeen) (string, []string) {
	email := strings.ToLower(row.email)
	if problem := recordConflict(row, onRecord, email); problem != "" {
		return problem, nil
	}
	if first, seen := g.byNIC[row.nic]; seen {
		return repeatedNIC(row, first, email)
	}
	row.email = email
	g.byNIC[row.nic] = row

	// A new NIC: look for the same person entered under another NIC, and for a shared email.
	var notes []string
	if note := g.phoneNote(row); note != "" {
		notes = append(notes, note)
	}
	if note := g.emailNote(row, onRecord, email); note != "" {
		notes = append(notes, note)
	}
	return "", notes
}

// recordConflict rejects a row whose NIC is on record under another name or email.
func recordConflict(row guardianSeen, onRecord *guardianSeen, email string) string {
	if onRecord == nil {
		return ""
	}
	if !names.SamePerson(onRecord.name, row.name) {
		return fmt.Sprintf("Guardian NIC %s belongs to %s on record, not %s. Check the NIC or the name.", row.nic, onRecord.name, row.name)
	}
	if onRecord.email != "" && email != "" && !strings.EqualFold(onRecord.email, email) {
		return fmt.Sprintf("Guardian NIC %s has the email %s on record, not %s. Check the NIC or the email.", row.nic, onRecord.email, row.email)
	}
	return ""
}

// repeatedNIC checks a NIC already seen earlier in the file: name and email must match, a different phone is a note.
func repeatedNIC(row, first guardianSeen, email string) (string, []string) {
	if !names.SamePerson(first.name, row.name) {
		return fmt.Sprintf("Guardian NIC %s is %s on line %d but %s here. One NIC must be one person: fix the name or the NIC.", row.nic, first.name, first.line, row.name), nil
	}
	if first.email != "" && email != "" && first.email != email {
		return fmt.Sprintf("Guardian NIC %s has the email %s on line %d but %s here. Use one email per guardian.", row.nic, first.email, first.line, row.email), nil
	}
	if first.phone != "" && row.phone != "" && first.phone != row.phone {
		return "", []string{fmt.Sprintf("Guardian phone differs from line %d; the first one (%s) is kept.", first.line, first.phone)}
	}
	return "", nil
}

// phoneNote flags the same person already entered under another NIC with this phone, and records the phone.
func (g *guardianChecker) phoneNote(row guardianSeen) string {
	if row.phone == "" {
		return ""
	}
	note := ""
	for _, other := range g.byPhone[row.phone] {
		if other.nic != row.nic && names.SamePerson(other.name, row.name) {
			nic := other.nic
			if nic == "" {
				nic = "no NIC"
			}
			note = fmt.Sprintf("%s with phone %s is already %s with %s. If this is the same person, use that NIC so the children share one guardian.", row.name, row.phone, other.where(), nic)
			break
		}
	}
	g.byPhone[row.phone] = append(g.byPhone[row.phone], row)
	return note
}

// emailNote flags an email already used by a login or another guardian, and records the email when it is new.
func (g *guardianChecker) emailNote(row guardianSeen, onRecord *guardianSeen, email string) string {
	// A guardian's own email on record is not a clash.
	if email == "" || (onRecord != nil && strings.EqualFold(onRecord.email, email)) {
		return ""
	}
	other, seen := g.byEmail[email]
	if !seen {
		g.byEmail[email] = row
		return ""
	}
	if other.account {
		return fmt.Sprintf("Email %s already belongs to an OpenSchool login (%s). This parent will need a different email to activate.", row.email, other.name)
	}
	if other.nic != row.nic {
		return fmt.Sprintf("Email %s is already used by %s %s. Each parent needs their own email to activate a login.", row.email, other.name, other.where())
	}
	return ""
}
