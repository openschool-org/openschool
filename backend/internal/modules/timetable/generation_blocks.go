package timetable

import (
	"context"
	"sort"

	"github.com/google/uuid"
)

// generationPlacement is one placed lesson (or double) of this run.
type generationPlacement = struct {
	task      generationTask
	slots     []generationSlot
	classroom *uuid.UUID
}

// blockPlacement is one period of an option block placed for a class.
type blockPlacement struct {
	BlockID uuid.UUID
	Slot    generationSlot
}

// generationGrid is the busy state shared by option blocks, lessons and the repair pass.
type generationGrid struct {
	slots                                                     []generationSlot
	teacherBusy, teacherUnavailable, classroomBusy, classBusy map[uuid.UUID]map[generationSlot]bool
}

// placeOptionBlocks puts every option block covering these classes at periods where all of the
// block's classes and all of their teachers for its subjects are free. It returns, per class, the
// subjects the blocks cover, so the lesson pass skips them. A block that also covers a class not
// being regenerated is skipped, because the classes must share the same periods.
func (s *generationService) placeOptionBlocks(ctx context.Context, generating []generationClass, teachersByClass map[uuid.UUID][]generationTeacherSubject,
	grid generationGrid, loadUnavailable func(uuid.UUID) error, placed map[uuid.UUID][]blockPlacement, required map[uuid.UUID]int, gap func(uuid.UUID, GenerationGap)) (map[uuid.UUID]map[uuid.UUID]bool, error) {
	ids := make([]uuid.UUID, len(generating))
	inRun := map[uuid.UUID]bool{}
	for i, c := range generating {
		ids[i] = c.ID
		inRun[c.ID] = true
	}
	blocks, err := s.store.optionBlocks(ctx, ids)
	if err != nil {
		return nil, err
	}
	covered := map[uuid.UUID]map[uuid.UUID]bool{}
	for _, b := range blocks {
		if !allIn(b.Classes, inRun) {
			for _, c := range b.Classes {
				if inRun[c] {
					gap(c, GenerationGap{SubjectName: b.Name, Reason: "this option block also covers a class whose timetable is not being regenerated, so it was not placed"})
				}
			}
			continue
		}
		markCovered(covered, b)
		teachers, err := blockTeachers(b, teachersByClass, loadUnavailable)
		if err != nil {
			return nil, err
		}
		placeBlockPeriods(b, teachers, grid, placed, required, gap)
	}
	return covered, nil
}

func allIn(ids []uuid.UUID, set map[uuid.UUID]bool) bool {
	for _, id := range ids {
		if !set[id] {
			return false
		}
	}
	return true
}

// markCovered records that the block's subjects are taught in the block for each of its classes.
func markCovered(covered map[uuid.UUID]map[uuid.UUID]bool, b OptionBlock) {
	for _, c := range b.Classes {
		if covered[c] == nil {
			covered[c] = map[uuid.UUID]bool{}
		}
		for _, sid := range b.Subjects {
			covered[c][sid] = true
		}
	}
}

// blockTeachers lists, in a stable order, every teacher of the block's subjects in its classes, loading their availability.
func blockTeachers(b OptionBlock, teachersByClass map[uuid.UUID][]generationTeacherSubject, loadUnavailable func(uuid.UUID) error) ([]uuid.UUID, error) {
	inBlock := map[uuid.UUID]bool{}
	for _, sid := range b.Subjects {
		inBlock[sid] = true
	}
	teacherSet := map[uuid.UUID]bool{}
	for _, c := range b.Classes {
		for _, t := range teachersByClass[c] {
			if inBlock[t.SubjectID] {
				teacherSet[t.TeacherID] = true
			}
		}
	}
	teachers := make([]uuid.UUID, 0, len(teacherSet))
	for t := range teacherSet {
		if err := loadUnavailable(t); err != nil {
			return nil, err
		}
		teachers = append(teachers, t)
	}
	sort.Slice(teachers, func(i, j int) bool { return teachers[i].String() < teachers[j].String() })
	return teachers, nil
}

// placeBlockPeriods books each block period where every class and teacher is free, on a new day when possible.
func placeBlockPeriods(b OptionBlock, teachers []uuid.UUID, grid generationGrid, placed map[uuid.UUID][]blockPlacement, required map[uuid.UUID]int, gap func(uuid.UUID, GenerationGap)) {
	free := func(slot generationSlot) bool {
		for _, c := range b.Classes {
			if grid.classBusy[c][slot] {
				return false
			}
		}
		for _, t := range teachers {
			if grid.teacherBusy[t][slot] || grid.teacherUnavailable[t][slot] {
				return false
			}
		}
		return true
	}
	usedDay := map[int16]bool{}
	order := shuffledGenerationSlots(grid.slots, b.ID, b.GradeID)
	for n := int32(0); n < b.Periods; n++ {
		for _, c := range b.Classes {
			required[c]++
		}
		chosen, ok := firstFreeSlot(order, usedDay, free)
		if !ok {
			for _, c := range b.Classes {
				gap(c, GenerationGap{SubjectName: b.Name, Reason: "no period where every class and teacher of this option block is free"})
			}
			continue
		}
		usedDay[chosen.Day] = true
		for _, c := range b.Classes {
			markGenerationBusy(grid.classBusy, c, chosen)
			placed[c] = append(placed[c], blockPlacement{BlockID: b.ID, Slot: chosen})
		}
		for _, t := range teachers {
			markGenerationBusy(grid.teacherBusy, t, chosen)
		}
	}
}

// firstFreeSlot prefers a free slot on an unused day, then any free slot.
func firstFreeSlot(order []generationSlot, usedDay map[int16]bool, free func(generationSlot) bool) (generationSlot, bool) {
	for _, freshDay := range []bool{true, false} {
		for _, slot := range order {
			if (freshDay && usedDay[slot.Day]) || !free(slot) {
				continue
			}
			return slot, true
		}
	}
	return generationSlot{}, false
}

// repair tries to fit a single lesson that found no free period by moving one of this run's
// single lessons taught by the same teacher to another free period, then taking its place.
// Lessons from other timetables, doubles and option blocks are never moved.
func (s *generationService) repair(ctx context.Context, task generationTask, grid generationGrid, placements map[uuid.UUID][]generationPlacement) (bool, error) {
	if task.Double || task.Lab {
		return false, nil
	}
	classIDs := make([]uuid.UUID, 0, len(placements))
	for id := range placements {
		classIDs = append(classIDs, id)
	}
	sort.Slice(classIDs, func(i, j int) bool { return classIDs[i].String() < classIDs[j].String() })
	for _, slot := range grid.slots {
		if grid.classBusy[task.ClassID][slot] || grid.teacherUnavailable[task.TeacherID][slot] || !grid.teacherBusy[task.TeacherID][slot] {
			continue
		}
		for _, cid := range classIDs {
			for pi := range placements[cid] {
				p := &placements[cid][pi]
				if p.task.TeacherID != task.TeacherID || len(p.slots) != 1 || p.slots[0] != slot {
					continue
				}
				if grid.moveLesson(p, cid, slot, task) {
					placements[task.ClassID] = append(placements[task.ClassID], generationPlacement{task: task, slots: []generationSlot{slot}, classroom: task.HomeClassroomID})
					return true, nil
				}
			}
		}
	}
	return false, ctx.Err()
}

func (g generationGrid) roomFree(room *uuid.UUID, slot generationSlot) bool {
	return room == nil || !g.classroomBusy[*room][slot]
}

// book marks the class, teacher and room (when set) busy at the slot.
func (g generationGrid) book(class, teacher uuid.UUID, room *uuid.UUID, slot generationSlot) {
	markGenerationBusy(g.classBusy, class, slot)
	markGenerationBusy(g.teacherBusy, teacher, slot)
	if room != nil {
		markGenerationBusy(g.classroomBusy, *room, slot)
	}
}

func (g generationGrid) release(class, teacher uuid.UUID, room *uuid.UUID, slot generationSlot) {
	delete(g.classBusy[class], slot)
	delete(g.teacherBusy[teacher], slot)
	if room != nil {
		delete(g.classroomBusy[*room], slot)
	}
}

// moveLesson moves lesson p of class cid out of slot to another free period, then books task into slot.
func (g generationGrid) moveLesson(p *generationPlacement, cid uuid.UUID, slot generationSlot, task generationTask) bool {
	for _, to := range g.slots {
		if to == slot || g.classBusy[cid][to] || g.teacherBusy[task.TeacherID][to] || g.teacherUnavailable[task.TeacherID][to] || !g.roomFree(p.classroom, to) {
			continue
		}
		// Free the period, then check it suits the new lesson.
		g.release(cid, task.TeacherID, p.classroom, slot)
		if !g.roomFree(task.HomeClassroomID, slot) {
			g.book(cid, task.TeacherID, p.classroom, slot)
			continue
		}
		g.book(cid, task.TeacherID, p.classroom, to)
		p.slots = []generationSlot{to}
		g.book(task.ClassID, task.TeacherID, task.HomeClassroomID, slot)
		return true
	}
	return false
}

func unplacedGap(task generationTask) GenerationGap {
	return GenerationGap{SubjectName: task.SubjectName, TeacherName: task.TeacherName, Reason: "no available slot — the week is fully booked for this class/teacher"}
}
