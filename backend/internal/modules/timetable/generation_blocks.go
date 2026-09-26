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
		complete := true
		for _, c := range b.Classes {
			if !inRun[c] {
				complete = false
			}
		}
		if !complete {
			for _, c := range b.Classes {
				if inRun[c] {
					gap(c, GenerationGap{SubjectName: b.Name, Reason: "this option block also covers a class whose timetable is not being regenerated, so it was not placed"})
				}
			}
			continue
		}
		inBlock := map[uuid.UUID]bool{}
		for _, sid := range b.Subjects {
			inBlock[sid] = true
		}
		teacherSet := map[uuid.UUID]bool{}
		for _, c := range b.Classes {
			if covered[c] == nil {
				covered[c] = map[uuid.UUID]bool{}
			}
			for _, sid := range b.Subjects {
				covered[c][sid] = true
			}
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
			var chosen *generationSlot
			for pass := 0; pass < 2 && chosen == nil; pass++ {
				for i := range order {
					if (pass == 0 && usedDay[order[i].Day]) || !free(order[i]) {
						continue
					}
					chosen = &order[i]
					break
				}
			}
			if chosen == nil {
				for _, c := range b.Classes {
					gap(c, GenerationGap{SubjectName: b.Name, Reason: "no period where every class and teacher of this option block is free"})
				}
				continue
			}
			usedDay[chosen.Day] = true
			for _, c := range b.Classes {
				markGenerationBusy(grid.classBusy, c, *chosen)
				placed[c] = append(placed[c], blockPlacement{BlockID: b.ID, Slot: *chosen})
			}
			for _, t := range teachers {
				markGenerationBusy(grid.teacherBusy, t, *chosen)
			}
		}
	}
	return covered, nil
}

// repair tries to fit a single lesson that found no free period by moving one of this run's
// single lessons taught by the same teacher to another free period, then taking its place.
// Lessons from other timetables, doubles and option blocks are never moved.
func (s *generationService) repair(ctx context.Context, task generationTask, grid generationGrid, placements map[uuid.UUID][]generationPlacement) (bool, error) {
	if task.Double || task.Lab {
		return false, nil
	}
	roomFree := func(room *uuid.UUID, slot generationSlot) bool {
		return room == nil || !grid.classroomBusy[*room][slot]
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
				for _, to := range grid.slots {
					if to == slot || grid.classBusy[cid][to] || grid.teacherBusy[task.TeacherID][to] || grid.teacherUnavailable[task.TeacherID][to] || !roomFree(p.classroom, to) {
						continue
					}
					// Move the blocking lesson, then check the freed period suits the new one.
					delete(grid.classBusy[cid], slot)
					delete(grid.teacherBusy[task.TeacherID], slot)
					if p.classroom != nil {
						delete(grid.classroomBusy[*p.classroom], slot)
					}
					if !roomFree(task.HomeClassroomID, slot) {
						markGenerationBusy(grid.classBusy, cid, slot)
						markGenerationBusy(grid.teacherBusy, task.TeacherID, slot)
						if p.classroom != nil {
							markGenerationBusy(grid.classroomBusy, *p.classroom, slot)
						}
						continue
					}
					markGenerationBusy(grid.classBusy, cid, to)
					markGenerationBusy(grid.teacherBusy, task.TeacherID, to)
					if p.classroom != nil {
						markGenerationBusy(grid.classroomBusy, *p.classroom, to)
					}
					p.slots = []generationSlot{to}
					markGenerationBusy(grid.classBusy, task.ClassID, slot)
					markGenerationBusy(grid.teacherBusy, task.TeacherID, slot)
					if task.HomeClassroomID != nil {
						markGenerationBusy(grid.classroomBusy, *task.HomeClassroomID, slot)
					}
					placements[task.ClassID] = append(placements[task.ClassID], generationPlacement{task: task, slots: []generationSlot{slot}, classroom: task.HomeClassroomID})
					return true, nil
				}
			}
		}
	}
	return false, ctx.Err()
}

func unplacedGap(task generationTask) GenerationGap {
	return GenerationGap{SubjectName: task.SubjectName, TeacherName: task.TeacherName, Reason: "no available slot — the week is fully booked for this class/teacher"}
}
