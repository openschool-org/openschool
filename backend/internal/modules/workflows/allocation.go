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
	load := map[uuid.UUID]int{}
	byID := map[uuid.UUID]TeacherInfo{}
	qualified := map[uuid.UUID][]TeacherInfo{}
	for _, t := range teachers {
		byID[t.ID] = t
		for sid := range t.Subjects {
			qualified[sid] = append(qualified[sid], t)
		}
	}
	for sid := range qualified {
		sort.Slice(qualified[sid], func(i, j int) bool { return qualified[sid][i].ID.String() < qualified[sid][j].ID.String() })
	}
	gradeTeam := map[[2]uuid.UUID]map[uuid.UUID]bool{} // grade+subject -> teachers already teaching it
	take := func(n AllocNeed, t uuid.UUID) {
		load[t] += n.Periods
		key := [2]uuid.UUID{n.GradeID, n.SubjectID}
		if gradeTeam[key] == nil {
			gradeTeam[key] = map[uuid.UUID]bool{}
		}
		gradeTeam[key][t] = true
	}

	out := map[int]AllocResult{}
	order := make([]int, len(needs))
	for i := range order {
		order[i] = i
	}
	sort.SliceStable(order, func(a, b int) bool {
		na, nb := needs[order[a]], needs[order[b]]
		if ea, eb := na.Existing != uuid.Nil, nb.Existing != uuid.Nil; ea != eb {
			return ea
		}
		if qa, qb := len(qualified[na.SubjectID]), len(qualified[nb.SubjectID]); qa != qb {
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

	for _, i := range order {
		n := needs[i]
		if n.Existing != uuid.Nil {
			take(n, n.Existing)
			out[i] = AllocResult{TeacherID: n.Existing, Reason: "Already assigned for next year."}
			continue
		}
		fits := func(t uuid.UUID) bool { return load[t]+n.Periods <= maxPeriods }
		if c, ok := byID[n.Continuity]; ok && c.Subjects[n.SubjectID] && fits(c.ID) {
			take(n, c.ID)
			out[i] = AllocResult{TeacherID: c.ID, Reason: fmt.Sprintf("Taught this class in %s last year.", n.PreviousClass)}
			continue
		}
		candidates := qualified[n.SubjectID]
		if len(candidates) == 0 {
			out[i] = AllocResult{Warning: "No teacher is qualified for " + n.SubjectName + ". Add it under Teacher subjects."}
			continue
		}
		var best *TeacherInfo
		team := gradeTeam[[2]uuid.UUID{n.GradeID, n.SubjectID}]
		for k := range candidates {
			t := &candidates[k]
			if !fits(t.ID) {
				continue
			}
			if best == nil || load[t.ID] < load[best.ID] || (load[t.ID] == load[best.ID] && team[t.ID] && !team[best.ID]) {
				best = t
			}
		}
		if best == nil {
			out[i] = AllocResult{Warning: fmt.Sprintf("Every teacher qualified for %s already has %d periods or more. Raise the limit or pick one by hand.", n.SubjectName, maxPeriods-n.Periods+1)}
			continue
		}
		take(n, best.ID)
		reason := fmt.Sprintf("Qualified, with the lightest week (%d periods).", load[best.ID])
		if n.Continuity != uuid.Nil && n.Continuity != best.ID {
			reason = "Last year's teacher is not available; " + reason
		}
		out[i] = AllocResult{TeacherID: best.ID, Reason: reason}
	}
	return out, load
}
