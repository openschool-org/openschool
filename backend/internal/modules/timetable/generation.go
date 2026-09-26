package timetable

import (
	"context"
	"fmt"
	"math/rand"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/middleware"
)

type GenerationRequest struct {
	GradeSectionID uuid.UUID `json:"grade_section_id" binding:"required"`
	AcademicYearID uuid.UUID `json:"academic_year_id" binding:"required"`
}

type GenerationGap struct {
	SubjectName string `json:"subject_name"`
	TeacherName string `json:"teacher_name,omitempty"`
	Reason      string `json:"reason"`
}

type ClassGenerationResult struct {
	ClassID     uuid.UUID       `json:"class_id"`
	ClassName   string          `json:"class_name"`
	TimetableID *uuid.UUID      `json:"timetable_id,omitempty"`
	Placed      int             `json:"placed"`
	Required    int             `json:"required"`
	Gaps        []GenerationGap `json:"gaps"`
	Skipped     bool            `json:"skipped"`
	SkipReason  string          `json:"skip_reason,omitempty"`
}

type GenerationResult struct {
	Classes []ClassGenerationResult `json:"classes"`
}

type generationClass struct {
	ID, GradeID     uuid.UUID
	Name            string
	HomeClassroomID *uuid.UUID
	FormTeacherID   *uuid.UUID
}
type generationRequirement struct {
	SubjectID                         uuid.UUID
	SubjectName                       string
	Periods, LabPeriods, DoubleBlocks int32
}
type generationTeacherSubject struct {
	SubjectID, TeacherID uuid.UUID
	TeacherName          string
}
type generationBusy struct {
	Day, Period            int16
	TeacherID, ClassroomID *uuid.UUID
	ClassName              string
}
type generationPeriod struct {
	Number   *int32
	SlotType string
}
type generationAvailability struct{ Day, Period int16 }

type generationStore interface {
	classesByGradeSection(context.Context, uuid.UUID, uuid.UUID) ([]generationClass, error)
	latestTimetablesByClass(context.Context, uuid.UUID, uuid.UUID) ([]TimetableListItem, error)
	deleteDraft(context.Context, uuid.UUID) (int64, error)
	allBookings(context.Context, uuid.UUID) ([]generationBusy, error)
	periods(context.Context, uuid.UUID) ([]generationPeriod, error)
	subjectTeachers(context.Context, uuid.UUID) ([]generationTeacherSubject, error)
	requirementsForGrade(context.Context, uuid.UUID, uuid.UUID) ([]generationRequirement, error)
	teacherName(context.Context, uuid.UUID) (string, error)
	availability(context.Context, uuid.UUID, uuid.UUID) ([]generationAvailability, error)
	labsForSubject(context.Context, uuid.UUID) ([]Classroom, error)
	create(context.Context, uuid.UUID, uuid.UUID, uuid.UUID, *uuid.UUID) (Timetable, error)
	upsertGeneratedEntry(context.Context, uuid.UUID, int16, int16, uuid.UUID, uuid.UUID, *uuid.UUID) error
	optionBlocks(context.Context, []uuid.UUID) ([]OptionBlock, error)
	upsertBlockEntry(context.Context, uuid.UUID, int16, int16, uuid.UUID) error
}

type generationSlot struct{ Day, Period int16 }
type generationTask struct {
	ClassID                  uuid.UUID
	SubjectID                uuid.UUID
	SubjectName, TeacherName string
	TeacherID                uuid.UUID
	Lab, Double              bool
	HomeClassroomID          *uuid.UUID
}

type generationService struct{ store generationStore }

func (s *generationService) generate(ctx context.Context, request GenerationRequest, actor uuid.UUID) (GenerationResult, error) {
	classes, err := s.store.classesByGradeSection(ctx, request.GradeSectionID, request.AcademicYearID)
	if err != nil {
		return GenerationResult{}, err
	}
	result := GenerationResult{Classes: make([]ClassGenerationResult, 0, len(classes))}
	generating := make([]generationClass, 0, len(classes))
	indexes := make(map[uuid.UUID]int, len(classes))
	for _, class := range classes {
		idx := len(result.Classes)
		indexes[class.ID] = idx
		result.Classes = append(result.Classes, ClassGenerationResult{ClassID: class.ID, ClassName: class.Name, Gaps: []GenerationGap{}})
		latest, err := s.store.latestTimetablesByClass(ctx, class.ID, request.AcademicYearID)
		if err != nil {
			return GenerationResult{}, err
		}
		if len(latest) > 0 && latest[0].Status != statusDraft {
			result.Classes[idx].Skipped = true
			result.Classes[idx].SkipReason = fmt.Sprintf("already has a %s timetable — delete or revise it manually first", latest[0].Status)
			continue
		}
		if len(latest) > 0 {
			if _, err := s.store.deleteDraft(ctx, latest[0].ID); err != nil {
				return GenerationResult{}, err
			}
		}
		generating = append(generating, class)
	}
	if len(generating) == 0 {
		return result, nil
	}
	periods, err := s.store.periods(ctx, request.GradeSectionID)
	if err != nil {
		return GenerationResult{}, err
	}
	slots, doubles := generationSlots(periods)
	if len(slots) == 0 {
		for _, class := range generating {
			result.Classes[indexes[class.ID]].Gaps = append(result.Classes[indexes[class.ID]].Gaps, GenerationGap{Reason: "this grade section has no period grid configured yet"})
		}
		return result, nil
	}
	busy, err := s.store.allBookings(ctx, request.AcademicYearID)
	if err != nil {
		return GenerationResult{}, err
	}
	teacherBusy, classroomBusy := map[uuid.UUID]map[generationSlot]bool{}, map[uuid.UUID]map[generationSlot]bool{}
	teacherUnavailable := map[uuid.UUID]map[generationSlot]bool{}
	for _, b := range busy {
		sl := generationSlot{b.Day, b.Period}
		if b.TeacherID != nil {
			markGenerationBusy(teacherBusy, *b.TeacherID, sl)
		}
		if b.ClassroomID != nil {
			markGenerationBusy(classroomBusy, *b.ClassroomID, sl)
		}
	}
	classBusy := map[uuid.UUID]map[generationSlot]bool{}
	usedDays := map[uuid.UUID]map[uuid.UUID]map[int16]bool{}
	placements := map[uuid.UUID][]struct {
		task      generationTask
		slots     []generationSlot
		classroom *uuid.UUID
	}{}
	required := map[uuid.UUID]int{}
	gap := func(classID uuid.UUID, g GenerationGap) {
		result.Classes[indexes[classID]].Gaps = append(result.Classes[indexes[classID]].Gaps, g)
	}
	loadUnavailable := func(teacherID uuid.UUID) error {
		if _, loaded := teacherUnavailable[teacherID]; loaded {
			return nil
		}
		blocked, err := s.store.availability(ctx, teacherID, request.AcademicYearID)
		if err != nil {
			return fmt.Errorf("failed to load teacher availability: %w", err)
		}
		teacherUnavailable[teacherID] = map[generationSlot]bool{}
		for _, slot := range blocked {
			teacherUnavailable[teacherID][generationSlot(slot)] = true
		}
		return nil
	}
	teachersByClass := map[uuid.UUID][]generationTeacherSubject{}
	for _, class := range generating {
		teachers, err := s.store.subjectTeachers(ctx, class.ID)
		if err != nil {
			return GenerationResult{}, err
		}
		teachersByClass[class.ID] = teachers
	}
	grid := generationGrid{slots: slots, teacherBusy: teacherBusy, teacherUnavailable: teacherUnavailable, classroomBusy: classroomBusy, classBusy: classBusy}
	// Option blocks go first: they need the same free period in several classes at once.
	blockPlacements := map[uuid.UUID][]blockPlacement{}
	covered, err := s.placeOptionBlocks(ctx, generating, teachersByClass, grid, loadUnavailable, blockPlacements, required, gap)
	if err != nil {
		return GenerationResult{}, err
	}
	var unplaced []generationTask
	for _, class := range generating {
		teacherBySubject := map[uuid.UUID]generationTeacherSubject{}
		for _, teacher := range teachersByClass[class.ID] {
			teacherBySubject[teacher.SubjectID] = teacher
		}
		reqs, err := s.store.requirementsForGrade(ctx, request.AcademicYearID, class.GradeID)
		if err != nil {
			return GenerationResult{}, err
		}
		for _, req := range reqs {
			if covered[class.ID][req.SubjectID] {
				continue
			}
			teacher, ok := teacherBySubject[req.SubjectID]
			if !ok && class.FormTeacherID != nil {
				teacher = generationTeacherSubject{SubjectID: req.SubjectID, TeacherID: *class.FormTeacherID}
				teacher.TeacherName, _ = s.store.teacherName(ctx, teacher.TeacherID)
				ok = true
			}
			if !ok {
				gap(class.ID, GenerationGap{SubjectName: req.SubjectName, Reason: "no teacher assigned for this subject"})
				continue
			}
			if err := loadUnavailable(teacher.TeacherID); err != nil {
				return GenerationResult{}, err
			}
			for block := int32(0); block < req.DoubleBlocks; block++ {
				task := generationTask{ClassID: class.ID, SubjectID: req.SubjectID, SubjectName: req.SubjectName, TeacherID: teacher.TeacherID, TeacherName: teacher.TeacherName, Lab: block*2 < req.LabPeriods, Double: true, HomeClassroomID: class.HomeClassroomID}
				required[class.ID] += 2
				placed, err := s.placeTask(ctx, task, slots, doubles, teacherBusy, teacherUnavailable, classroomBusy, classBusy, usedDays, &placements)
				if err != nil {
					return GenerationResult{}, err
				}
				if !placed {
					unplaced = append(unplaced, task)
				}
			}
			for n := req.DoubleBlocks * 2; n < req.Periods; n++ {
				task := generationTask{ClassID: class.ID, SubjectID: req.SubjectID, SubjectName: req.SubjectName, TeacherID: teacher.TeacherID, TeacherName: teacher.TeacherName, Lab: n < req.LabPeriods, HomeClassroomID: class.HomeClassroomID}
				required[class.ID]++
				placed, err := s.placeTask(ctx, task, slots, doubles, teacherBusy, teacherUnavailable, classroomBusy, classBusy, usedDays, &placements)
				if err != nil {
					return GenerationResult{}, err
				}
				if !placed {
					unplaced = append(unplaced, task)
				}
			}
		}
	}
	// Repair pass: a lesson that found no period may still fit by moving one of the teacher's other lessons.
	for _, task := range unplaced {
		fixed, err := s.repair(ctx, task, grid, placements)
		if err != nil {
			return GenerationResult{}, err
		}
		if !fixed {
			gap(task.ClassID, unplacedGap(task))
		}
	}
	for _, class := range generating {
		idx := indexes[class.ID]
		result.Classes[idx].Required = required[class.ID]
		for _, placement := range placements[class.ID] {
			result.Classes[idx].Placed += len(placement.slots)
		}
		result.Classes[idx].Placed += len(blockPlacements[class.ID])
		if result.Classes[idx].Placed == 0 {
			continue
		}
		draft, err := s.store.create(ctx, request.AcademicYearID, class.ID, actor, nil)
		if err != nil {
			return GenerationResult{}, err
		}
		result.Classes[idx].TimetableID = &draft.ID
		for _, placement := range placements[class.ID] {
			for _, slot := range placement.slots {
				if err := s.store.upsertGeneratedEntry(ctx, draft.ID, slot.Day, slot.Period, placement.task.SubjectID, placement.task.TeacherID, placement.classroom); err != nil {
					return GenerationResult{}, err
				}
			}
		}
		for _, bp := range blockPlacements[class.ID] {
			if err := s.store.upsertBlockEntry(ctx, draft.ID, bp.Slot.Day, bp.Slot.Period, bp.BlockID); err != nil {
				return GenerationResult{}, err
			}
		}
	}
	return result, nil
}

func (s *generationService) placeTask(ctx context.Context, task generationTask, slots []generationSlot, doubles [][2]generationSlot, teacherBusy, teacherUnavailable, classroomBusy, classBusy map[uuid.UUID]map[generationSlot]bool, usedDays map[uuid.UUID]map[uuid.UUID]map[int16]bool, placements *map[uuid.UUID][]struct {
	task      generationTask
	slots     []generationSlot
	classroom *uuid.UUID
}) (bool, error) {
	var labs []Classroom
	var err error
	if task.Lab {
		labs, err = s.store.labsForSubject(ctx, task.SubjectID)
		if err != nil {
			return false, err
		}
	}
	if usedDays[task.ClassID] == nil {
		usedDays[task.ClassID] = map[uuid.UUID]map[int16]bool{}
	}
	if usedDays[task.ClassID][task.SubjectID] == nil {
		usedDays[task.ClassID][task.SubjectID] = map[int16]bool{}
	}
	okSlot := func(slot generationSlot) (*uuid.UUID, bool) {
		if classBusy[task.ClassID][slot] || teacherBusy[task.TeacherID][slot] || teacherUnavailable[task.TeacherID][slot] {
			return nil, false
		}
		if task.Lab {
			for _, lab := range labs {
				if !classroomBusy[lab.ID][slot] {
					id := lab.ID
					return &id, true
				}
			}
			return nil, false
		}
		if task.HomeClassroomID != nil && classroomBusy[*task.HomeClassroomID][slot] {
			return nil, false
		}
		return task.HomeClassroomID, true
	}
	try := func(pair []generationSlot) bool {
		classroom, ok := okSlot(pair[0])
		if !ok {
			return false
		}
		if len(pair) == 2 {
			next, ok := okSlot(pair[1])
			if !ok || (classroom != nil && (next == nil || *classroom != *next)) {
				return false
			}
		}
		for _, slot := range pair {
			markGenerationBusy(classBusy, task.ClassID, slot)
			markGenerationBusy(teacherBusy, task.TeacherID, slot)
			if classroom != nil {
				markGenerationBusy(classroomBusy, *classroom, slot)
			}
		}
		usedDays[task.ClassID][task.SubjectID][pair[0].Day] = true
		(*placements)[task.ClassID] = append((*placements)[task.ClassID], struct {
			task      generationTask
			slots     []generationSlot
			classroom *uuid.UUID
		}{task, pair, classroom})
		return true
	}
	if task.Double {
		for _, pair := range shuffledGenerationDoubles(doubles, task.ClassID, task.SubjectID) {
			if !usedDays[task.ClassID][task.SubjectID][pair[0].Day] && try([]generationSlot{pair[0], pair[1]}) {
				return true, nil
			}
		}
		for _, pair := range shuffledGenerationDoubles(doubles, task.ClassID, task.SubjectID) {
			if try([]generationSlot{pair[0], pair[1]}) {
				return true, nil
			}
		}
	} else {
		for _, slot := range shuffledGenerationSlots(slots, task.ClassID, task.SubjectID) {
			if !usedDays[task.ClassID][task.SubjectID][slot.Day] && try([]generationSlot{slot}) {
				return true, nil
			}
		}
		for _, slot := range shuffledGenerationSlots(slots, task.ClassID, task.SubjectID) {
			if try([]generationSlot{slot}) {
				return true, nil
			}
		}
	}
	return false, nil
}

func generationSlots(periods []generationPeriod) ([]generationSlot, [][2]generationSlot) {
	var slots []generationSlot
	var adjacent [][2]int16
	for i, p := range periods {
		if p.SlotType == "period" && p.Number != nil {
			for day := int16(1); day <= 5; day++ {
				slots = append(slots, generationSlot{day, int16(*p.Number)})
			}
			if i > 0 && periods[i-1].SlotType == "period" && periods[i-1].Number != nil {
				adjacent = append(adjacent, [2]int16{int16(*periods[i-1].Number), int16(*p.Number)})
			}
		}
	}
	var doubles [][2]generationSlot
	for day := int16(1); day <= 5; day++ {
		for _, p := range adjacent {
			doubles = append(doubles, [2]generationSlot{{day, p[0]}, {day, p[1]}})
		}
	}
	return slots, doubles
}
func markGenerationBusy(m map[uuid.UUID]map[generationSlot]bool, id uuid.UUID, slot generationSlot) {
	if m[id] == nil {
		m[id] = map[generationSlot]bool{}
	}
	m[id][slot] = true
}
func shuffledGenerationSlots(in []generationSlot, classID, subjectID uuid.UUID) []generationSlot {
	out := append([]generationSlot(nil), in...)
	rand.New(rand.NewSource(generationSeed(classID, subjectID))).Shuffle(len(out), func(i, j int) { out[i], out[j] = out[j], out[i] })
	return out
}
func shuffledGenerationDoubles(in [][2]generationSlot, classID, subjectID uuid.UUID) [][2]generationSlot {
	out := append([][2]generationSlot(nil), in...)
	rand.New(rand.NewSource(generationSeed(classID, subjectID)+1)).Shuffle(len(out), func(i, j int) { out[i], out[j] = out[j], out[i] })
	return out
}
func generationSeed(a, b uuid.UUID) int64 {
	var seed int64
	for _, x := range a {
		seed = seed*31 + int64(x)
	}
	for _, x := range b {
		seed = seed*31 + int64(x)
	}
	return seed
}

func RegisterTimetableGenerationRoute(admin *gin.RouterGroup, store generationStore) {
	admin.POST("/timetables/generate", func(c *gin.Context) {
		var req GenerationRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		actor, err := middleware.UserIDFromContext(c)
		if err != nil {
			c.JSON(401, gin.H{"error": "invalid caller identity"})
			return
		}
		result, err := (&generationService{store: store}).generate(c.Request.Context(), req, actor)
		if err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, result)
	})
}
