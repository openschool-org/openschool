package workflows

import (
	"fmt"
	"sort"

	"github.com/google/uuid"
)

// AllocNeed is one subject a class must be taught next year.
type AllocNeed struct {
	ClassID, SubjectID, GradeID uuid.UUID
	ClassName, SubjectName      string
	GradeOrder                  int32
	Periods                     int
	Existing                    uuid.UUID // already assigned in the target year; kept as is
	Continuity                  uuid.UUID // taught this subject to the class's students last year
	PreviousClass               string
}

// AllocResult is the engine's decision for one need.
type AllocResult struct {
	TeacherID       uuid.UUID
	Reason, Warning string
}

// Allocate gives every class subject a qualified teacher, deterministically: assignments already
// made are kept, then the scarcest subjects are filled first, preferring the teacher who taught the
// class last year and otherwise the qualified teacher with the lightest week. No teacher is taken
// past maxPeriods; a need that cannot be filled is left empty with the reason.
func Allocate(needs []AllocNeed, teachers []TeacherInfo, maxPeriods int) (map[int]AllocResult, map[uuid.UUID]int) {
	al := newAllocator(teachers, maxPeriods)
	out := map[int]AllocResult{}
	for _, i := range al.order(needs) {
		out[i] = al.assign(needs[i])
	}
	return out, al.load
}

// allocator holds the running teacher loads while Allocate works through the needs.
type allocator struct {
	maxPeriods int
	load       map[uuid.UUID]int
	byID       map[uuid.UUID]TeacherInfo
	qualified  map[uuid.UUID][]TeacherInfo         // subject -> teachers, sorted by id
	gradeTeam  map[[2]uuid.UUID]map[uuid.UUID]bool // grade+subject -> teachers already teaching it
}

func newAllocator(teachers []TeacherInfo, maxPeriods int) *allocator {
	al := &allocator{maxPeriods: maxPeriods, load: map[uuid.UUID]int{}, byID: map[uuid.UUID]TeacherInfo{}, qualified: map[uuid.UUID][]TeacherInfo{}, gradeTeam: map[[2]uuid.UUID]map[uuid.UUID]bool{}}
	for _, t := range teachers {
		al.byID[t.ID] = t
		for sid := range t.Subjects {
			al.qualified[sid] = append(al.qualified[sid], t)
		}
	}
	for sid := range al.qualified {
		q := al.qualified[sid]
		sort.Slice(q, func(i, j int) bool { return q[i].ID.String() < q[j].ID.String() })
	}
	return al
}

func (al *allocator) take(n AllocNeed, t uuid.UUID) {
	al.load[t] += n.Periods
	key := [2]uuid.UUID{n.GradeID, n.SubjectID}
	if al.gradeTeam[key] == nil {
		al.gradeTeam[key] = map[uuid.UUID]bool{}
	}
	al.gradeTeam[key][t] = true
}

func (al *allocator) fits(n AllocNeed, t uuid.UUID) bool {
	return al.load[t]+n.Periods <= al.maxPeriods
}

// order puts existing assignments first, then the scarcest subjects, the biggest needs, and grade/class/subject order.
func (al *allocator) order(needs []AllocNeed) []int {
	order := make([]int, len(needs))
	for i := range order {
		order[i] = i
	}
	sort.SliceStable(order, func(a, b int) bool {
		na, nb := needs[order[a]], needs[order[b]]
		if ea, eb := na.Existing != uuid.Nil, nb.Existing != uuid.Nil; ea != eb {
			return ea
		}
		if qa, qb := len(al.qualified[na.SubjectID]), len(al.qualified[nb.SubjectID]); qa != qb {
			return qa < qb
		}
		if na.Periods != nb.Periods {
			return na.Periods > nb.Periods
		}
		if na.GradeOrder != nb.GradeOrder {
			return na.GradeOrder < nb.GradeOrder
		}
		if na.ClassName != nb.ClassName {
			return naturalLess(na.ClassName, nb.ClassName)
		}
		return na.SubjectName < nb.SubjectName
	})
	return order
}

// assign fills one need: keep an existing teacher, then last year's teacher, then the lightest qualified one.
func (al *allocator) assign(n AllocNeed) AllocResult {
	if n.Existing != uuid.Nil {
		al.take(n, n.Existing)
		return AllocResult{TeacherID: n.Existing, Reason: "Already assigned for next year."}
	}
	if c, ok := al.byID[n.Continuity]; ok && c.Subjects[n.SubjectID] && al.fits(n, c.ID) {
		al.take(n, c.ID)
		return AllocResult{TeacherID: c.ID, Reason: fmt.Sprintf("Taught this class in %s last year.", n.PreviousClass)}
	}
	if len(al.qualified[n.SubjectID]) == 0 {
		return AllocResult{Warning: "No teacher is qualified for " + n.SubjectName + ". Add it under Teacher subjects."}
	}
	best := al.lightest(n)
	if best == nil {
		return AllocResult{Warning: fmt.Sprintf("Every teacher qualified for %s already has %d periods or more. Raise the limit or pick one by hand.", n.SubjectName, al.maxPeriods-n.Periods+1)}
	}
	al.take(n, best.ID)
	reason := fmt.Sprintf("Qualified, with the lightest week (%d periods).", al.load[best.ID])
	if n.Continuity != uuid.Nil && n.Continuity != best.ID {
		reason = "Last year's teacher is not available; " + reason
	}
	return AllocResult{TeacherID: best.ID, Reason: reason}
}

// lightest returns the qualified teacher with room and the lightest week, preferring one already on the grade's team.
func (al *allocator) lightest(n AllocNeed) *TeacherInfo {
	var best *TeacherInfo
	team := al.gradeTeam[[2]uuid.UUID{n.GradeID, n.SubjectID}]
	candidates := al.qualified[n.SubjectID]
	for k := range candidates {
		t := &candidates[k]
		if !al.fits(n, t.ID) {
			continue
		}
		if best == nil || al.load[t.ID] < al.load[best.ID] || (al.load[t.ID] == al.load[best.ID] && team[t.ID] && !team[best.ID]) {
			best = t
		}
	}
	return best
}
