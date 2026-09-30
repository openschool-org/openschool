package workflows

import (
	"strings"
	"testing"
)

func row(line int, nic, name, email, phone string) guardianSeen {
	return guardianSeen{line: line, nic: nic, name: name, email: email, phone: phone}
}

func TestGuardianCheckerSiblingsMustAgree(t *testing.T) {
	g := newGuardianChecker()
	if p, _ := g.check(row(2, "197512345678", "Sunil Perera", "sunil@example.com", "0712345678"), nil); p != "" {
		t.Fatalf("first row: %s", p)
	}
	if p, notes := g.check(row(3, "197512345678", "SUNIL  perera.", "", "0712345678"), nil); p != "" || len(notes) != 0 {
		t.Fatalf("case, dots and spaces must not count as a different name: %q %v", p, notes)
	}
	if p, _ := g.check(row(4, "197512345678", "Kamal Perera", "", ""), nil); !strings.Contains(p, "is Sunil Perera on line 2 but Kamal Perera here") {
		t.Fatalf("different name under one NIC must block, got %q", p)
	}
	if p, _ := g.check(row(5, "197512345678", "Sunil Perera", "other@example.com", ""), nil); !strings.Contains(p, "Use one email per guardian") {
		t.Fatalf("different email under one NIC must block, got %q", p)
	}
	if p, notes := g.check(row(6, "197512345678", "Sunil Perera", "", "0777777777"), nil); p != "" || len(notes) != 1 || !strings.Contains(notes[0], "first one (0712345678) is kept") {
		t.Fatalf("different phone should only be noted: %q %v", p, notes)
	}
}

func TestGuardianCheckerComparesWithRecords(t *testing.T) {
	g := newGuardianChecker()
	g.seed(
		[]guardianSeen{{nic: "198012345678", name: "Kumari Silva", phone: "0771111111"}},
		[]guardianSeen{{email: "taken@example.com", name: "Some Teacher", account: true}, {email: "kumari@example.com", name: "Kumari Silva", nic: "198012345678"}},
	)
	onRecord := &guardianSeen{name: "Kumari Silva", email: "kumari@example.com"}
	if p, _ := g.check(row(2, "198012345678", "Nimal Silva", "", ""), onRecord); !strings.Contains(p, "belongs to Kumari Silva on record") {
		t.Fatalf("name clash with the record must block, got %q", p)
	}
	if p, _ := g.check(row(3, "198012345678", "Kumari Silva", "kumari2@example.com", ""), onRecord); !strings.Contains(p, "on record, not kumari2@example.com") {
		t.Fatalf("email clash with the record must block, got %q", p)
	}
	g = newGuardianChecker()
	g.seed([]guardianSeen{{nic: "198012345678", name: "Kumari Silva", phone: "0771111111"}},
		[]guardianSeen{{email: "taken@example.com", name: "Some Teacher", account: true}, {email: "kumari@example.com", name: "Kumari Silva", nic: "198012345678"}})
	if p, notes := g.check(row(2, "198012345678", "Kumari Silva", "kumari@example.com", "0771111111"), onRecord); p != "" || len(notes) != 0 {
		t.Fatalf("a guardian matching their own record must pass quietly: %q %v", p, notes)
	}
	if _, notes := g.check(row(3, "199912345678", "kumari silva", "", "0771111111"), nil); len(notes) != 1 || !strings.Contains(notes[0], "already on record with 198012345678") {
		t.Fatalf("same person under a new NIC should be noted: %v", notes)
	}
	if _, notes := g.check(row(4, "200012345678", "Ruwan Jayasuriya", "TAKEN@example.com", ""), nil); len(notes) != 1 || !strings.Contains(notes[0], "already belongs to an OpenSchool login") {
		t.Fatalf("an email owned by a login should be noted: %v", notes)
	}
	if _, notes := g.check(row(5, "200112345678", "Nadee Fernando", "kumari@example.com", ""), nil); len(notes) != 1 || !strings.Contains(notes[0], "already used by Kumari Silva on record") {
		t.Fatalf("an email owned by another guardian should be noted: %v", notes)
	}
}
