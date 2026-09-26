package automation

import (
	"os"
	"path/filepath"
	"regexp"
	"testing"
)

// Every notice an agent sends must be declared as a check's FindingTitle, or its banner never shows.
func TestEveryNoticeTitleIsDeclared(t *testing.T) {
	agents := []Describer{
		&SystemHealthAgent{}, &StructuralIntegrityAgent{}, &PeopleComplianceAgent{}, &AcademicDeliveryAgent{},
		&SecurityAuditAgent{}, &DataRetentionAgent{}, &IdentityErasureRetryAgent{},
	}
	declared := map[string]bool{}
	for _, a := range agents {
		if len(a.Checks()) == 0 || a.Title() == "" {
			t.Errorf("%T declares no title or checks", a)
		}
		for _, c := range a.Checks() {
			if c.FindingTitle != "" {
				declared[c.FindingTitle] = true
			}
		}
	}
	literal := regexp.MustCompile(`notifyAdmins\(ctx, a\.checks, a\.notifSvc, "([^"]+)"`)
	files, _ := filepath.Glob("*.go")
	found := 0
	for _, f := range files {
		src, err := os.ReadFile(f)
		if err != nil {
			t.Fatal(err)
		}
		for _, m := range literal.FindAllStringSubmatch(string(src), -1) {
			found++
			if !declared[m[1]] {
				t.Errorf("%s sends %q but no agent declares it as a FindingTitle", f, m[1])
			}
		}
	}
	if found < 10 {
		t.Fatalf("found only %d notice titles; the pattern no longer matches the code", found)
	}
	// The onboarding check builds its title from the role label.
	for _, role := range []string{"Teacher", "Student"} {
		if !declared[role+" accounts stuck in first-login setup"] {
			t.Errorf("onboarding title for %s is not declared", role)
		}
	}
}

func TestPageMatchesIsAPrefixMatch(t *testing.T) {
	if !pageMatches([]string{"/classes"}, "/classes/123") || pageMatches([]string{"/classes"}, "/classrooms") {
		t.Fatal("pageMatches must match the page and its sub-routes only")
	}
}

func TestEveryAgentScheduleHasALabel(t *testing.T) {
	for _, j := range []Job{&SystemHealthAgent{}, &StructuralIntegrityAgent{}, &PeopleComplianceAgent{}, &AcademicDeliveryAgent{}, &SecurityAuditAgent{}, &DataRetentionAgent{}, &IdentityErasureRetryAgent{}} {
		if scheduleLabel(j.Schedule()) == j.Schedule() {
			t.Errorf("%s schedule %q has no label", j.Name(), j.Schedule())
		}
	}
}
