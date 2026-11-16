package curriculum

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"testing"

	"github.com/google/uuid"
)

var updateGolden = flag.Bool("update", false, "rewrite golden files")

// fakePreset keeps preset rows in memory and logs every write in order.
type fakePreset struct {
	grades   []presetGrade
	subjects []presetSubjectRow
	levels   []Level
	groups   map[uuid.UUID][]SelectionGroup
	links    map[uuid.UUID][]GroupSubject
	log      []string
	nextID   int
}

func (f *fakePreset) id() uuid.UUID {
	f.nextID++
	return uuid.MustParse(fmt.Sprintf("00000000-0000-0000-0000-%012d", f.nextID))
}

func (f *fakePreset) listPresetGrades(context.Context) ([]presetGrade, error) { return f.grades, nil }
func (f *fakePreset) listPresetSubjects(context.Context) ([]presetSubjectRow, error) {
	return f.subjects, nil
}
func (f *fakePreset) withPresetTx(_ context.Context, _ bool, fn func(presetTx) error) error {
	return fn(f)
}
func (f *fakePreset) createSubject(_ context.Context, s presetSubject) (presetSubjectRow, error) {
	row := presetSubjectRow{ID: f.id(), Code: s.Code}
	f.subjects = append(f.subjects, row)
	f.log = append(f.log, "subject "+s.Code)
	return row, nil
}
func (f *fakePreset) listLevels(context.Context) ([]Level, error) { return f.levels, nil }
func (f *fakePreset) createLevel(_ context.Context, label string, _ uuid.UUID, order int32) (Level, error) {
	l := Level{ID: f.id().String(), Label: label, SortOrder: order}
	f.levels = append(f.levels, l)
	f.log = append(f.log, fmt.Sprintf("level %s #%d", label, order))
	return l, nil
}
func (f *fakePreset) listGroups(_ context.Context, level uuid.UUID) ([]SelectionGroup, error) {
	return f.groups[level], nil
}
func (f *fakePreset) createGroup(_ context.Context, level uuid.UUID, g presetGroup, order int32) (SelectionGroup, error) {
	sg := SelectionGroup{ID: f.id().String(), LevelID: level.String(), Label: g.Label, SortOrder: order}
	f.groups[level] = append(f.groups[level], sg)
	f.log = append(f.log, fmt.Sprintf("group %s #%d", g.Label, order))
	return sg, nil
}
func (f *fakePreset) listSubjects(_ context.Context, group uuid.UUID) ([]GroupSubject, error) {
	return f.links[group], nil
}
func (f *fakePreset) addPresetSubject(_ context.Context, group, subject uuid.UUID, order int32) error {
	code := ""
	for _, s := range f.subjects {
		if s.ID == subject {
			code = s.Code
		}
	}
	f.links[group] = append(f.links[group], GroupSubject{SubjectID: subject.String(), SubjectCode: code})
	f.log = append(f.log, fmt.Sprintf("link %s #%d", code, order))
	return nil
}

func newFakePreset() *fakePreset {
	f := &fakePreset{groups: map[uuid.UUID][]SelectionGroup{}, links: map[uuid.UUID][]GroupSubject{}}
	for _, name := range []string{"Grade 1", "Grade 6", "Grade 10", "Grade 12", "Kindergarten"} {
		f.grades = append(f.grades, presetGrade{ID: f.id(), Name: name})
	}
	// One subject and one level already exist, so the run must reuse them.
	f.subjects = append(f.subjects, presetSubjectRow{ID: f.id(), Code: presetSubjects[0].Code})
	f.levels = append(f.levels, Level{ID: f.id().String(), Label: "Grade 6"})
	return f
}

type presetRecord struct {
	Preview PresetSummary
	Run     PresetSummary
	Again   PresetSummary
	Writes  []string
}

func TestPresetRunGolden(t *testing.T) {
	ctx := context.Background()
	f := newFakePreset()
	svc := NewPresetService(f)

	var rec presetRecord
	var err error
	if rec.Preview, err = svc.Preview(ctx); err != nil {
		t.Fatal(err)
	}
	if len(f.log) != 0 {
		t.Fatalf("preview wrote rows: %v", f.log)
	}
	if rec.Run, err = svc.Run(ctx); err != nil {
		t.Fatal(err)
	}
	rec.Writes = f.log
	if rec.Again, err = svc.Run(ctx); err != nil {
		t.Fatal(err)
	}
	if len(f.log) != len(rec.Writes) {
		t.Fatalf("second run wrote rows: %v", f.log[len(rec.Writes):])
	}

	got, _ := json.MarshalIndent(rec, "", "  ")
	path := "testdata/preset_run.golden.json"
	if *updateGolden {
		if err := os.MkdirAll("testdata", 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, got, 0o644); err != nil {
			t.Fatal(err)
		}
	}
	want, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != string(want) {
		t.Fatalf("preset output changed; run with -update if intended\n%s", got)
	}
}
