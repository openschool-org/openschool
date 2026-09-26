package workflows

import (
	"crypto/sha256"
	"encoding/binary"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"unicode"
)

// Promotion rules for one grade move. They mirror promotion_policies.policy.
const (
	PolicyKeepSection     = "keep_section"
	PolicyBalanced        = "balanced_reshuffle"
	PolicyBySubjectChoice = "by_subject_choice"
	PolicyByStream        = "by_stream"
	PolicyGraduate        = "graduate"
)

var policyLabels = map[string]string{
	PolicyKeepSection:     "Keep the same section",
	PolicyBalanced:        "Reshuffle to balance classes",
	PolicyBySubjectChoice: "Group by subject choice",
	PolicyByStream:        "Group by A/L stream",
	PolicyGraduate:        "Leave school",
}

// PlacementStudent is one student moving into a target grade.
type PlacementStudent struct {
	ID, Name, Gender, HouseID string
	CurrentClass              string
	MediumID                  string // empty when their class is not tied to a medium
	StreamID, StreamGroupID   string // from the level of their next-year subject choices
	ChoiceKey, ChoiceLabel    string // their optional subjects for next year, sorted
	Marks                     float64
	HasMarks                  bool
}

// PlacementClass is one class in the target grade; ID may be "new:<name>" for a class the proposal adds.
type PlacementClass struct {
	ID, Name                          string
	MediumID, StreamID, StreamGroupID string
	Capacity, Occupied                int
	New                               bool
}

// Placement is the engine's decision for one student.
type Placement struct {
	StudentID, ClassID, Reason, Warning string
}

type placementState struct {
	classes  []*PlacementClass
	count    map[string]int
	gender   map[string]map[string]int
	house    map[string]map[string]int
	choice   map[string]map[string]int
	template PlacementClass
}

// Place assigns every student a class in the target grade under one rule. It is deterministic:
// the same students, classes, rule and seed always give the same answer. Classes that run out of
// room are extended with new sections (ID "new:..."), which the proposal lets a person keep or drop.
func Place(students []PlacementStudent, classes []PlacementClass, policy string, spreadByMarks bool, seed string, defaultCapacity int) ([]Placement, []PlacementClass) {
	st := &placementState{count: map[string]int{}, gender: map[string]map[string]int{}, house: map[string]map[string]int{}, choice: map[string]map[string]int{}}
	for i := range classes {
		c := classes[i]
		st.classes = append(st.classes, &c)
		st.count[c.ID] = c.Occupied
	}
	sort.SliceStable(st.classes, func(i, j int) bool { return naturalLess(st.classes[i].Name, st.classes[j].Name) })
	if len(st.classes) > 0 {
		st.template = *st.classes[len(st.classes)-1]
	}

	ordered := orderStudents(students, policy, spreadByMarks, seed)
	out := make([]Placement, 0, len(ordered))
	for rank, s := range ordered {
		out = append(out, st.place(s, policy, spreadByMarks, rank, defaultCapacity))
	}
	var added []PlacementClass
	for _, c := range st.classes {
		if c.New {
			added = append(added, *c)
		}
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].StudentID < out[j].StudentID })
	return out, added
}

// orderStudents fixes the processing order: groups first for choice-based rules, then a seeded shuffle,
// or marks rank when spreading by marks. Sorting by ID first makes the input order irrelevant.
func orderStudents(students []PlacementStudent, policy string, spreadByMarks bool, seed string) []PlacementStudent {
	out := append([]PlacementStudent(nil), students...)
	sort.Slice(out, func(i, j int) bool { return out[i].ID < out[j].ID })
	switch {
	case policy == PolicyBySubjectChoice || policy == PolicyByStream:
		size := map[string]int{}
		for _, s := range out {
			size[groupKey(s, policy)]++
		}
		sort.SliceStable(out, func(i, j int) bool {
			gi, gj := groupKey(out[i], policy), groupKey(out[j], policy)
			if size[gi] != size[gj] {
				return size[gi] > size[gj]
			}
			if gi != gj {
				return gi < gj
			}
			return hash(seed, out[i].ID) < hash(seed, out[j].ID)
		})
	case spreadByMarks:
		sort.SliceStable(out, func(i, j int) bool {
			if out[i].HasMarks != out[j].HasMarks {
				return out[i].HasMarks
			}
			if out[i].Marks != out[j].Marks {
				return out[i].Marks > out[j].Marks
			}
			return hash(seed, out[i].ID) < hash(seed, out[j].ID)
		})
	default:
		sort.SliceStable(out, func(i, j int) bool { return hash(seed, out[i].ID) < hash(seed, out[j].ID) })
	}
	return out
}

func groupKey(s PlacementStudent, policy string) string {
	key := s.MediumID + "|" + s.ChoiceKey
	if policy == PolicyByStream {
		key = s.StreamID + "|" + s.StreamGroupID + "|" + key
	}
	return key
}

func hash(seed, id string) uint64 {
	sum := sha256.Sum256([]byte(seed + ":" + id))
	return binary.BigEndian.Uint64(sum[:8])
}

func (st *placementState) place(s PlacementStudent, policy string, spreadByMarks bool, rank, defaultCapacity int) Placement {
	p := Placement{StudentID: s.ID}
	if policy == PolicyByStream && s.StreamID == "" {
		p.Warning = "No A/L stream recorded for next year. Enrol the student in a stream's subjects first, or pick a class by hand."
		return p
	}
	candidates, fallback := st.compatible(s, policy)
	if policy == PolicyByStream && len(candidates) == 0 {
		p.Warning = "No class next year matches this student's stream."
		return p
	}
	if len(candidates) == 0 {
		candidates = st.classes
	}

	var chosen *PlacementClass
	switch policy {
	case PolicyKeepSection:
		section := sectionOf(s.CurrentClass)
		for _, c := range candidates {
			if sectionOf(c.Name) == section && st.hasRoom(c) {
				chosen = c
				p.Reason = fmt.Sprintf("Same section: %s to %s.", s.CurrentClass, c.Name)
				break
			}
		}
		if chosen == nil {
			chosen = st.leastLoaded(candidates, s)
			if chosen != nil {
				p.Reason = fmt.Sprintf("No room in section %s next year; placed where there is space.", section)
			}
		}
	case PolicyBySubjectChoice, PolicyByStream:
		chosen = st.withMostSameChoice(candidates, s)
		if chosen != nil {
			label := s.ChoiceLabel
			if label == "" {
				label = "no optional subjects recorded"
			}
			p.Reason = "Grouped with the same choice: " + label + "."
			if s.ChoiceKey == "" && policy == PolicyBySubjectChoice {
				p.Warning = "No subject choice recorded for next year; placed by size only."
			}
		}
	default:
		if spreadByMarks {
			chosen = st.snake(candidates, rank)
			if chosen != nil {
				p.Reason = fmt.Sprintf("Spread by last term's marks (rank %d).", rank+1)
			}
		} else {
			chosen = st.leastLoaded(candidates, s)
			if chosen != nil {
				p.Reason = "Balanced by class size, gender and house."
			}
		}
	}

	if chosen == nil {
		chosen = st.addClass(s, policy, defaultCapacity)
		p.Warning = "The matching classes are full, so the proposal adds " + chosen.Name + "."
	}
	if fallback && p.Warning == "" {
		p.Warning = "No class next year is set for this student's medium; placed in a general class."
	}
	st.assign(chosen, s)
	p.ClassID = chosen.ID
	return p
}

// compatible returns the classes a student may go to; fallback is true when the medium could not be matched.
func (st *placementState) compatible(s PlacementStudent, policy string) ([]*PlacementClass, bool) {
	var sameMedium, general []*PlacementClass
	for _, c := range st.classes {
		if policy == PolicyByStream && (c.StreamID != s.StreamID || (c.StreamGroupID != "" && c.StreamGroupID != s.StreamGroupID)) {
			continue
		}
		switch {
		case c.MediumID != "" && c.MediumID == s.MediumID:
			sameMedium = append(sameMedium, c)
		case c.MediumID == "":
			general = append(general, c)
		}
	}
	if s.MediumID != "" {
		if len(sameMedium) > 0 {
			return sameMedium, false
		}
		return general, len(general) > 0
	}
	return general, false
}

func (st *placementState) hasRoom(c *PlacementClass) bool { return st.count[c.ID] < c.Capacity }

// leastLoaded picks the class with space that is least full, then has fewest of the student's
// gender, then fewest of their house, then comes first by name.
func (st *placementState) leastLoaded(cs []*PlacementClass, s PlacementStudent) *PlacementClass {
	var best *PlacementClass
	better := func(a, b *PlacementClass) bool {
		ra := float64(st.count[a.ID]) / float64(a.Capacity)
		rb := float64(st.count[b.ID]) / float64(b.Capacity)
		if ra != rb {
			return ra < rb
		}
		if ga, gb := st.gender[a.ID][s.Gender], st.gender[b.ID][s.Gender]; ga != gb {
			return ga < gb
		}
		if ha, hb := st.house[a.ID][s.HouseID], st.house[b.ID][s.HouseID]; ha != hb {
			return ha < hb
		}
		return naturalLess(a.Name, b.Name)
	}
	for _, c := range cs {
		if st.hasRoom(c) && (best == nil || better(c, best)) {
			best = c
		}
	}
	return best
}

// withMostSameChoice keeps a subject combination together: the class already holding most of it wins.
func (st *placementState) withMostSameChoice(cs []*PlacementClass, s PlacementStudent) *PlacementClass {
	var best *PlacementClass
	for _, c := range cs {
		if !st.hasRoom(c) {
			continue
		}
		if best == nil {
			best = c
			continue
		}
		cb, cc := st.choice[best.ID][s.ChoiceKey], st.choice[c.ID][s.ChoiceKey]
		if cc > cb || (cc == cb && cc == 0 && st.count[c.ID] < st.count[best.ID]) {
			best = c
		}
	}
	return best
}

// snake deals students A B C C B A ... by rank so every class gets the same spread of marks.
func (st *placementState) snake(cs []*PlacementClass, rank int) *PlacementClass {
	if len(cs) == 0 {
		return nil
	}
	n := len(cs)
	idx := rank % n
	if (rank/n)%2 == 1 {
		idx = n - 1 - idx
	}
	for i := 0; i < n; i++ {
		c := cs[(idx+i)%n]
		if st.hasRoom(c) {
			return c
		}
	}
	return nil
}

func (st *placementState) assign(c *PlacementClass, s PlacementStudent) {
	st.count[c.ID]++
	inc := func(m map[string]map[string]int, key string) {
		if m[c.ID] == nil {
			m[c.ID] = map[string]int{}
		}
		m[c.ID][key]++
	}
	inc(st.gender, s.Gender)
	inc(st.house, s.HouseID)
	inc(st.choice, s.ChoiceKey)
}

// addClass creates the next section after the last one, with the student's medium and stream.
func (st *placementState) addClass(s PlacementStudent, policy string, capacity int) *PlacementClass {
	names := make([]string, len(st.classes))
	for i, c := range st.classes {
		names[i] = c.Name
	}
	name := nextSectionName(names, st.template.Name)
	c := &PlacementClass{ID: "new:" + name, Name: name, MediumID: s.MediumID, Capacity: capacity, New: true}
	if policy == PolicyByStream {
		c.StreamID, c.StreamGroupID = s.StreamID, s.StreamGroupID
	}
	st.classes = append(st.classes, c)
	return c
}

// sectionOf returns the part after the last "-" ("6-A" gives "A"), or the whole name.
func sectionOf(name string) string {
	if i := strings.LastIndex(name, "-"); i >= 0 {
		return strings.TrimSpace(name[i+1:])
	}
	return strings.TrimSpace(name)
}

// nextSectionName continues the naming pattern: 7-A..7-D gives 7-E, 12-S1 gives 12-S2.
func nextSectionName(existing []string, template string) string {
	taken := map[string]bool{}
	for _, n := range existing {
		taken[strings.ToLower(n)] = true
	}
	prefix, section := template, ""
	if i := strings.LastIndex(template, "-"); i >= 0 {
		prefix, section = template[:i+1], template[i+1:]
	}
	for step := 1; step < 100; step++ {
		var candidate string
		switch {
		case section == "":
			candidate = fmt.Sprintf("%s %d", template, step+1)
		case len(section) == 1 && unicode.IsLetter(rune(section[0])):
			candidate = prefix + string(rune(section[0])+rune(step))
		default:
			stem := strings.TrimRightFunc(section, unicode.IsDigit)
			n, _ := strconv.Atoi(section[len(stem):])
			candidate = prefix + stem + strconv.Itoa(n+step)
		}
		if !taken[strings.ToLower(candidate)] {
			return candidate
		}
	}
	return template + " (new)"
}

// naturalLess sorts "7-B" before "7-10" and "12-S2" before "12-S10".
func naturalLess(a, b string) bool {
	ai, bi := 0, 0
	for ai < len(a) && bi < len(b) {
		if unicode.IsDigit(rune(a[ai])) && unicode.IsDigit(rune(b[bi])) {
			aj, bj := ai, bi
			for aj < len(a) && unicode.IsDigit(rune(a[aj])) {
				aj++
			}
			for bj < len(b) && unicode.IsDigit(rune(b[bj])) {
				bj++
			}
			na, _ := strconv.Atoi(a[ai:aj])
			nb, _ := strconv.Atoi(b[bi:bj])
			if na != nb {
				return na < nb
			}
			ai, bi = aj, bj
			continue
		}
		if a[ai] != b[bi] {
			return a[ai] < b[bi]
		}
		ai++
		bi++
	}
	return len(a)-ai < len(b)-bi
}
