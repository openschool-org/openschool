package timetable

import (
	"context"
	"fmt"
	"math/rand"
	"sort"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/openschool-org/openschool/db/sqlc"
	models "github.com/openschool-org/openschool/internal/models/timetable"
)

// weekdays is the day-of-week domain used throughout the timetable module
// (1=Monday .. 5=Friday); see teacher_availability's CHECK constraint.
var weekdays = []int16{1, 2, 3, 4, 5}

type genSlot struct {
	Day    int16
	Period int16
}

// genTask is one placement unit a class needs scheduled for a subject —
// either a single period, or (Double) a back-to-back pair sharing one
// subject/teacher/classroom, e.g. AL subjects that run 2 consecutive
// periods.
type genTask struct {
	ClassID         uuid.UUID
	ClassName       string
	SubjectID       uuid.UUID
	SubjectName     string
	TeacherID       uuid.UUID
	TeacherName     string
	LabRequired     bool
	Double          bool
	HomeClassroomID *uuid.UUID
}

type genPlacement struct {
	task        genTask
	slots       []genSlot // 1 slot normally, 2 for a double period
	classroomID *uuid.UUID
}

// GenerateForGradeSection best-effort auto-fills draft timetables for every
// class in a grade_section at once — teachers and lab/ECA classrooms are
// shared across those classes, so generating them together is the only way
// to avoid double-booking a shared resource. Students keep one fixed
// homeroom all day (the Sri Lankan model); only lab-required periods move
// to a subject-tagged lab classroom, and subjects flagged for double
// periods are placed as back-to-back pairs. Unsatisfiable periods are left
// as reported gaps rather than blocking the whole run.
func (s *TimetableService) GenerateForGradeSection(ctx context.Context, gradeSectionID, academicYearID, actorID uuid.UUID) (models.GenerationResult, error) {
	classes, err := s.classRepo.ListByGradeSection(ctx, gradeSectionID, academicYearID)
	if err != nil {
		return models.GenerationResult{}, err
	}

	result := models.GenerationResult{Classes: make([]models.ClassGenerationResult, 0, len(classes))}
	if len(classes) == 0 {
		return result, nil
	}

	// Resolve each class's latest timetable: skip ones already past draft
	// (leave them untouched), and clear a stale draft now so it doesn't
	// pollute the busy-set preload below with placements we're about to
	// replace.
	type genClass struct {
		class db.Class
		idx   int
	}
	generating := make([]genClass, 0, len(classes))
	resultIdxByClass := make(map[uuid.UUID]int, len(classes))

	for _, cls := range classes {
		idx := len(result.Classes)
		result.Classes = append(result.Classes, models.ClassGenerationResult{ClassID: cls.ID, ClassName: cls.Name, Gaps: []models.GenerationGap{}})
		resultIdxByClass[cls.ID] = idx

		latest, err := s.repo.ListByClass(ctx, cls.ID, academicYearID)
		if err != nil {
			return models.GenerationResult{}, err
		}
		if len(latest) > 0 && latest[0].Status != models.StatusDraft {
			result.Classes[idx].Skipped = true
			result.Classes[idx].SkipReason = fmt.Sprintf("already has a %s timetable — delete or revise it manually first", latest[0].Status)
			continue
		}
		if len(latest) > 0 {
			if err := s.DeleteDraft(ctx, latest[0].ID); err != nil {
				return models.GenerationResult{}, err
			}
		}
		generating = append(generating, genClass{class: cls, idx: idx})
	}
	if len(generating) == 0 {
		return result, nil
	}

	// Whole-year busy-set, taken after the deletes above so this run never
	// sees its own about-to-be-replaced placements as occupying slots.
	yearEntries, err := s.repo.ListAllEntriesForYear(ctx, academicYearID)
	if err != nil {
		return models.GenerationResult{}, err
	}
	teacherBusy := map[uuid.UUID]map[genSlot]bool{}
	classroomBusy := map[uuid.UUID]map[genSlot]bool{}
	for _, e := range yearEntries {
		sl := genSlot{Day: e.DayOfWeek, Period: e.PeriodNumber}
		if e.TeacherID.Valid {
			markBusy(teacherBusy, uuid.UUID(e.TeacherID.Bytes), sl)
		}
		if e.ClassroomID.Valid {
			markBusy(classroomBusy, uuid.UUID(e.ClassroomID.Bytes), sl)
		}
	}

	// The section's period grid — identical for every class in it.
	periods, err := s.gradeSectionRepo.ListPeriods(ctx, gradeSectionID)
	if err != nil {
		return models.GenerationResult{}, err
	}
	var allSlots []genSlot
	for _, p := range periods {
		if p.SlotType != "period" || !p.PeriodNumber.Valid {
			continue
		}
		for _, day := range weekdays {
			allSlots = append(allSlots, genSlot{Day: day, Period: int16(p.PeriodNumber.Int32)})
		}
	}
	// Adjacent period pairs — two consecutive rows in the grid (by
	// sort_order) that are BOTH real periods, i.e. genuinely back-to-back
	// with no interval/break between them. This is what a "double period"
	// is allowed to use.
	var adjacentPairs [][2]int16
	for i := 0; i+1 < len(periods); i++ {
		a, b := periods[i], periods[i+1]
		if a.SlotType == "period" && b.SlotType == "period" && a.PeriodNumber.Valid && b.PeriodNumber.Valid {
			adjacentPairs = append(adjacentPairs, [2]int16{int16(a.PeriodNumber.Int32), int16(b.PeriodNumber.Int32)})
		}
	}
	var allDoubleSlots [][2]genSlot
	for _, day := range weekdays {
		for _, pair := range adjacentPairs {
			allDoubleSlots = append(allDoubleSlots, [2]genSlot{{Day: day, Period: pair[0]}, {Day: day, Period: pair[1]}})
		}
	}

	if len(allSlots) == 0 {
		for _, gc := range generating {
			result.Classes[gc.idx].Gaps = append(result.Classes[gc.idx].Gaps, models.GenerationGap{
				Reason: "this grade section has no period grid configured yet",
			})
		}
		return result, nil
	}

	// Build the flat worklist across every generating class.
	requirementCache := map[uuid.UUID][]db.ListSubjectPeriodRequirementsByGradeRow{}
	var worklist []genTask
	teacherTaskCount := map[uuid.UUID]int{}

	for _, gc := range generating {
		cls := gc.class
		var homeClassroomID *uuid.UUID
		if cls.HomeClassroomID.Valid {
			id := uuid.UUID(cls.HomeClassroomID.Bytes)
			homeClassroomID = &id
		}
		var formTeacherID *uuid.UUID
		if cls.FormTeacherID.Valid {
			id := uuid.UUID(cls.FormTeacherID.Bytes)
			formTeacherID = &id
		}

		subjectTeachers, err := s.classRepo.ListSubjectTeachers(ctx, cls.ID)
		if err != nil {
			return models.GenerationResult{}, err
		}
		teacherBySubject := make(map[uuid.UUID]db.ListSubjectTeachersByClassRow, len(subjectTeachers))
		for _, st := range subjectTeachers {
			teacherBySubject[st.SubjectID] = st
		}

		reqs, ok := requirementCache[cls.GradeID]
		if !ok {
			reqs, err = s.requirementRepo.ListByGrade(ctx, academicYearID, cls.GradeID)
			if err != nil {
				return models.GenerationResult{}, err
			}
			requirementCache[cls.GradeID] = reqs
		}

		for _, req := range reqs {
			var teacherID uuid.UUID
			var teacherName string
			if st, ok := teacherBySubject[req.SubjectID]; ok {
				teacherID, teacherName = st.TeacherID, st.TeacherName
			} else if formTeacherID != nil {
				// A form teacher covering a subject with no explicit
				// class_subject_teachers row is normal (primary classes
				// especially) — Validate() grants the same blanket bypass.
				teacherID = *formTeacherID
				if teacher, err := s.teacherRepo.GetByID(ctx, teacherID); err == nil {
					teacherName = teacher.FullName
				}
			} else {
				result.Classes[gc.idx].Gaps = append(result.Classes[gc.idx].Gaps, models.GenerationGap{
					SubjectName: req.SubjectName,
					Reason:      "no teacher assigned for this subject",
				})
				continue
			}

			base := genTask{
				ClassID: cls.ID, ClassName: cls.Name,
				SubjectID: req.SubjectID, SubjectName: req.SubjectName,
				TeacherID: teacherID, TeacherName: teacherName,
				HomeClassroomID: homeClassroomID,
			}

			// DoublePeriodBlocks carves out that many back-to-back 2-period
			// pairs from periods_per_week — not all-or-nothing: a subject
			// can have e.g. 6 periods/week with only 1 or 2 of those as
			// double blocks and the rest scheduled as regular singles.
			periodIndex := int32(0)
			for b := int32(0); b < req.DoublePeriodBlocks; b++ {
				task := base
				task.LabRequired = periodIndex < req.LabPeriodsPerWeek || periodIndex+1 < req.LabPeriodsPerWeek
				task.Double = true
				worklist = append(worklist, task)
				teacherTaskCount[teacherID]++
				periodIndex += 2
			}
			for ; periodIndex < req.PeriodsPerWeek; periodIndex++ {
				task := base
				task.LabRequired = periodIndex < req.LabPeriodsPerWeek
				worklist = append(worklist, task)
				teacherTaskCount[teacherID]++
			}
		}
	}

	// Preload every worklist teacher's unavailability once, up front.
	teacherUnavailable := map[uuid.UUID]map[genSlot]bool{}
	for teacherID := range teacherTaskCount {
		avail, err := s.availabilityRepo.ListByTeacherYear(ctx, teacherID, academicYearID)
		if err != nil {
			continue
		}
		for _, a := range avail {
			markBusy(teacherUnavailable, teacherID, genSlot{Day: a.DayOfWeek, Period: a.PeriodNumber})
		}
	}

	// Most-constrained-first: double-lab, then lab, then double, then plain
	// — scarcer resource requirements go first — then heavier-loaded
	// teachers before lighter ones.
	taskRank := func(t genTask) int {
		r := 0
		if t.LabRequired {
			r += 2
		}
		if t.Double {
			r++
		}
		return r
	}
	sort.SliceStable(worklist, func(i, j int) bool {
		ri, rj := taskRank(worklist[i]), taskRank(worklist[j])
		if ri != rj {
			return ri > rj
		}
		return teacherTaskCount[worklist[i].TeacherID] > teacherTaskCount[worklist[j].TeacherID]
	})

	classBusy := map[uuid.UUID]map[genSlot]bool{}
	classSubjectDayUsed := map[uuid.UUID]map[uuid.UUID]map[int16]bool{}
	labsBySubject := map[uuid.UUID][]db.Classroom{}
	placementsByClass := map[uuid.UUID][]genPlacement{}

	markSlotUsed := func(classID, subjectID uuid.UUID, day int16) {
		if classSubjectDayUsed[classID] == nil {
			classSubjectDayUsed[classID] = map[uuid.UUID]map[int16]bool{}
		}
		if classSubjectDayUsed[classID][subjectID] == nil {
			classSubjectDayUsed[classID][subjectID] = map[int16]bool{}
		}
		classSubjectDayUsed[classID][subjectID][day] = true
	}

	for _, task := range worklist {
		var labs []db.Classroom
		if task.LabRequired {
			var ok bool
			labs, ok = labsBySubject[task.SubjectID]
			if !ok {
				labs, _ = s.classroomRepo.ListBySubject(ctx, task.SubjectID)
				labsBySubject[task.SubjectID] = labs
			}
		}
		usedDays := classSubjectDayUsed[task.ClassID][task.SubjectID]

		// slotOK reports whether a single slot is free for this task's
		// class/teacher, returning the classroom to use if so.
		slotOK := func(sl genSlot) (*uuid.UUID, bool) {
			if classBusy[task.ClassID][sl] || teacherBusy[task.TeacherID][sl] || teacherUnavailable[task.TeacherID][sl] {
				return nil, false
			}
			if task.LabRequired {
				for _, lab := range labs {
					if !classroomBusy[lab.ID][sl] {
						id := lab.ID
						return &id, true
					}
				}
				return nil, false
			}
			if task.HomeClassroomID != nil && classroomBusy[*task.HomeClassroomID][sl] {
				return nil, false
			}
			return task.HomeClassroomID, true
		}

		var chosenSlots []genSlot
		var chosenClassroom *uuid.UUID

		if task.Double {
			candidates := shuffledDoubleSlots(allDoubleSlots, task.ClassID, task.SubjectID)
			find := func(preferUnusedDay bool) bool {
				for _, pair := range candidates {
					if preferUnusedDay && usedDays[pair[0].Day] {
						continue
					}
					// Both slots must resolve to the SAME classroom — it's
					// one continuous lesson in one room.
					cr1, ok1 := slotOK(pair[0])
					if !ok1 {
						continue
					}
					if task.LabRequired {
						if cr1 == nil || classroomBusy[*cr1][pair[1]] || classBusy[task.ClassID][pair[1]] ||
							teacherBusy[task.TeacherID][pair[1]] || teacherUnavailable[task.TeacherID][pair[1]] {
							continue
						}
					} else {
						cr2, ok2 := slotOK(pair[1])
						if !ok2 || (cr1 == nil) != (cr2 == nil) || (cr1 != nil && *cr1 != *cr2) {
							continue
						}
					}
					chosenSlots = []genSlot{pair[0], pair[1]}
					chosenClassroom = cr1
					return true
				}
				return false
			}
			if !find(true) {
				find(false)
			}
		} else {
			candidates := shuffledSlots(allSlots, task.ClassID, task.SubjectID)
			find := func(preferUnusedDay bool) bool {
				for _, sl := range candidates {
					if preferUnusedDay && usedDays[sl.Day] {
						continue
					}
					if cr, ok := slotOK(sl); ok {
						chosenSlots = []genSlot{sl}
						chosenClassroom = cr
						return true
					}
				}
				return false
			}
			if !find(true) {
				find(false)
			}
		}

		if len(chosenSlots) == 0 {
			reason := "no available slot — the week is fully booked for this class/teacher"
			if task.Double && len(adjacentPairs) == 0 {
				reason = "this grade section's grid has no back-to-back periods for a double period"
			} else if task.LabRequired && len(labs) == 0 {
				reason = "no lab classroom configured for this subject"
			}
			idx := resultIdxByClass[task.ClassID]
			result.Classes[idx].Gaps = append(result.Classes[idx].Gaps, models.GenerationGap{
				SubjectName: task.SubjectName, TeacherName: task.TeacherName, Reason: reason,
			})
			continue
		}

		for _, sl := range chosenSlots {
			markBusy(classBusy, task.ClassID, sl)
			markBusy(teacherBusy, task.TeacherID, sl)
			if chosenClassroom != nil {
				markBusy(classroomBusy, *chosenClassroom, sl)
			}
		}
		markSlotUsed(task.ClassID, task.SubjectID, chosenSlots[0].Day)

		placementsByClass[task.ClassID] = append(placementsByClass[task.ClassID], genPlacement{task: task, slots: chosenSlots, classroomID: chosenClassroom})
	}

	// Persist: a fresh draft per generating class that has at least one
	// placement, written via the same per-cell upsert SaveEntries uses.
	requiredByClass := map[uuid.UUID]int{}
	for _, task := range worklist {
		if task.Double {
			requiredByClass[task.ClassID] += 2
		} else {
			requiredByClass[task.ClassID]++
		}
	}

	for _, gc := range generating {
		idx := gc.idx
		placements := placementsByClass[gc.class.ID]
		placedCount := 0
		for _, p := range placements {
			placedCount += len(p.slots)
		}
		result.Classes[idx].Required = requiredByClass[gc.class.ID]
		result.Classes[idx].Placed = placedCount
		if len(placements) == 0 {
			continue
		}

		draft, err := s.Create(ctx, models.CreateTimetableRequest{AcademicYearID: academicYearID, ClassID: gc.class.ID}, actorID)
		if err != nil {
			return models.GenerationResult{}, err
		}
		id := draft.ID
		result.Classes[idx].TimetableID = &id

		for _, p := range placements {
			for _, sl := range p.slots {
				params := db.UpsertTimetableEntryParams{
					TimetableID:  draft.ID,
					DayOfWeek:    sl.Day,
					PeriodNumber: sl.Period,
					SubjectID:    pgtype.UUID{Bytes: p.task.SubjectID, Valid: true},
					TeacherID:    pgtype.UUID{Bytes: p.task.TeacherID, Valid: true},
				}
				if p.classroomID != nil {
					params.ClassroomID = pgtype.UUID{Bytes: *p.classroomID, Valid: true}
				}
				if _, err := s.repo.UpsertEntry(ctx, params); err != nil {
					return models.GenerationResult{}, err
				}
			}
		}
	}

	return result, nil
}

func markBusy(m map[uuid.UUID]map[genSlot]bool, id uuid.UUID, sl genSlot) {
	if m[id] == nil {
		m[id] = map[genSlot]bool{}
	}
	m[id][sl] = true
}

// shuffledSlots returns a deterministically-shuffled copy of allSlots,
// seeded by class+subject so re-running generation on unchanged input
// produces the same layout.
func shuffledSlots(allSlots []genSlot, classID, subjectID uuid.UUID) []genSlot {
	rng := rand.New(rand.NewSource(seedFor(classID, subjectID)))
	out := make([]genSlot, len(allSlots))
	copy(out, allSlots)
	rng.Shuffle(len(out), func(i, j int) { out[i], out[j] = out[j], out[i] })
	return out
}

// shuffledDoubleSlots is shuffledSlots for adjacent-pair candidates.
func shuffledDoubleSlots(allDoubleSlots [][2]genSlot, classID, subjectID uuid.UUID) [][2]genSlot {
	rng := rand.New(rand.NewSource(seedFor(classID, subjectID) + 1))
	out := make([][2]genSlot, len(allDoubleSlots))
	copy(out, allDoubleSlots)
	rng.Shuffle(len(out), func(i, j int) { out[i], out[j] = out[j], out[i] })
	return out
}

func seedFor(classID, subjectID uuid.UUID) int64 {
	seed := int64(0)
	for _, b := range classID {
		seed = seed*31 + int64(b)
	}
	for _, b := range subjectID {
		seed = seed*31 + int64(b)
	}
	return seed
}
