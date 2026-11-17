package timetable

import (
	"context"
	"fmt"
	"github.com/openschool-org/openschool/internal/apierror"
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
	run := &generationRun{generationService: s, ctx: ctx, request: request, indexes: map[uuid.UUID]int{}}
	generating, err := run.selectClasses()
	if err != nil || len(generating) == 0 {
		return run.result, err
	}
	periods, err := s.store.periods(ctx, request.GradeSectionID)
	if err != nil {
		return GenerationResult{}, err
	}
	slots, doubles := generationSlots(periods)
	if len(slots) == 0 {
		for _, class := range generating {
			run.gap(class.ID, GenerationGap{Reason: "this grade section has no period grid configured yet"})
		}
		return run.result, nil
	}
	if err := run.loadGrid(slots, doubles); err != nil {
		return GenerationResult{}, err
	}
	teachersByClass := map[uuid.UUID][]generationTeacherSubject{}
	for _, class := range generating {
		teachers, err := s.store.subjectTeachers(ctx, class.ID)
		if err != nil {
			return GenerationResult{}, err
		}
		teachersByClass[class.ID] = teachers
	}
	// Option blocks go first: they need the same free period in several classes at once.
	blockPlacements := map[uuid.UUID][]blockPlacement{}
	covered, err := s.placeOptionBlocks(ctx, generating, teachersByClass, run.grid, run.loadUnavailable, blockPlacements, run.required, run.gap)
	if err != nil {
		return GenerationResult{}, err
	}
	for _, class := range generating {
		if err := run.placeClassLessons(class, teachersByClass[class.ID], covered[class.ID]); err != nil {
			return GenerationResult{}, err
		}
	}
	// Repair pass: a lesson that found no period may still fit by moving one of the teacher's other lessons.
	for _, task := range run.unplaced {
		fixed, err := s.repair(ctx, task, run.grid, run.placements)
		if err != nil {
			return GenerationResult{}, err
		}
		if !fixed {
			run.gap(task.ClassID, unplacedGap(task))
		}
	}
	for _, class := range generating {
		if err := run.save(class, actor, blockPlacements[class.ID]); err != nil {
			return GenerationResult{}, err
		}
	}
	return run.result, nil
}

// generationRun is the state of one generate call: the result so far and the shared busy grid.
type generationRun struct {
	*generationService
	ctx     context.Context
	request GenerationRequest
	result  GenerationResult
	indexes map[uuid.UUID]int

	grid       generationGrid
	doubles    [][2]generationSlot
	usedDays   map[uuid.UUID]map[uuid.UUID]map[int16]bool // class -> subject -> days used
	placements map[uuid.UUID][]generationPlacement
	required   map[uuid.UUID]int
	unplaced   []generationTask
}

func (r *generationRun) gap(classID uuid.UUID, g GenerationGap) {
	idx := r.indexes[classID]
	r.result.Classes[idx].Gaps = append(r.result.Classes[idx].Gaps, g)
}

// selectClasses skips classes whose latest timetable is past draft and deletes old drafts of the rest.
func (r *generationRun) selectClasses() ([]generationClass, error) {
	classes, err := r.store.classesByGradeSection(r.ctx, r.request.GradeSectionID, r.request.AcademicYearID)
	if err != nil {
		return nil, err
	}
	r.result = GenerationResult{Classes: make([]ClassGenerationResult, 0, len(classes))}
	generating := make([]generationClass, 0, len(classes))
	for _, class := range classes {
		idx := len(r.result.Classes)
		r.indexes[class.ID] = idx
		r.result.Classes = append(r.result.Classes, ClassGenerationResult{ClassID: class.ID, ClassName: class.Name, Gaps: []GenerationGap{}})
		latest, err := r.store.latestTimetablesByClass(r.ctx, class.ID, r.request.AcademicYearID)
		if err != nil {
			return nil, err
		}
		if len(latest) > 0 && latest[0].Status != statusDraft {
			r.result.Classes[idx].Skipped = true
			r.result.Classes[idx].SkipReason = fmt.Sprintf("already has a %s timetable — delete or revise it manually first", latest[0].Status)
			continue
		}
		if len(latest) > 0 {
			if _, err := r.store.deleteDraft(r.ctx, latest[0].ID); err != nil {
				return nil, err
			}
		}
		generating = append(generating, class)
	}
	return generating, nil
}

// loadGrid marks every period already booked in this year by other timetables.
func (r *generationRun) loadGrid(slots []generationSlot, doubles [][2]generationSlot) error {
	busy, err := r.store.allBookings(r.ctx, r.request.AcademicYearID)
	if err != nil {
		return err
	}
	r.grid = generationGrid{slots: slots, teacherBusy: map[uuid.UUID]map[generationSlot]bool{}, teacherUnavailable: map[uuid.UUID]map[generationSlot]bool{},
		classroomBusy: map[uuid.UUID]map[generationSlot]bool{}, classBusy: map[uuid.UUID]map[generationSlot]bool{}}
	for _, b := range busy {
		sl := generationSlot{b.Day, b.Period}
		if b.TeacherID != nil {
			markGenerationBusy(r.grid.teacherBusy, *b.TeacherID, sl)
		}
		if b.ClassroomID != nil {
			markGenerationBusy(r.grid.classroomBusy, *b.ClassroomID, sl)
		}
	}
	r.doubles = doubles
	r.usedDays = map[uuid.UUID]map[uuid.UUID]map[int16]bool{}
	r.placements = map[uuid.UUID][]generationPlacement{}
	r.required = map[uuid.UUID]int{}
	return nil
}

func (r *generationRun) loadUnavailable(teacherID uuid.UUID) error {
	if _, loaded := r.grid.teacherUnavailable[teacherID]; loaded {
		return nil
	}
	blocked, err := r.store.availability(r.ctx, teacherID, r.request.AcademicYearID)
	if err != nil {
		return fmt.Errorf("failed to load teacher availability: %w", err)
	}
	r.grid.teacherUnavailable[teacherID] = map[generationSlot]bool{}
	for _, slot := range blocked {
		r.grid.teacherUnavailable[teacherID][generationSlot(slot)] = true
	}
	return nil
}

// placeClassLessons places every required lesson not covered by an option block; the form teacher fills in for a subject with no teacher.
func (r *generationRun) placeClassLessons(class generationClass, teachers []generationTeacherSubject, covered map[uuid.UUID]bool) error {
	teacherBySubject := map[uuid.UUID]generationTeacherSubject{}
	for _, teacher := range teachers {
		teacherBySubject[teacher.SubjectID] = teacher
	}
	reqs, err := r.store.requirementsForGrade(r.ctx, r.request.AcademicYearID, class.GradeID)
	if err != nil {
		return err
	}
	for _, req := range reqs {
		if covered[req.SubjectID] {
			continue
		}
		teacher, ok := teacherBySubject[req.SubjectID]
		if !ok && class.FormTeacherID != nil {
			teacher = generationTeacherSubject{SubjectID: req.SubjectID, TeacherID: *class.FormTeacherID}
			teacher.TeacherName, _ = r.store.teacherName(r.ctx, teacher.TeacherID)
			ok = true
		}
		if !ok {
			r.gap(class.ID, GenerationGap{SubjectName: req.SubjectName, Reason: "no teacher assigned for this subject"})
			continue
		}
		if err := r.loadUnavailable(teacher.TeacherID); err != nil {
			return err
		}
		if err := r.placeRequirement(class, req, teacher); err != nil {
			return err
		}
	}
	return nil
}

// placeRequirement places the subject's doubles first, then its single periods; lab periods are used up first.
func (r *generationRun) placeRequirement(class generationClass, req generationRequirement, teacher generationTeacherSubject) error {
	base := generationTask{ClassID: class.ID, SubjectID: req.SubjectID, SubjectName: req.SubjectName, TeacherID: teacher.TeacherID, TeacherName: teacher.TeacherName, HomeClassroomID: class.HomeClassroomID}
	for block := int32(0); block < req.DoubleBlocks; block++ {
		task := base
		task.Lab, task.Double = block*2 < req.LabPeriods, true
		r.required[class.ID] += 2
		if err := r.place(task); err != nil {
			return err
		}
	}
	for n := req.DoubleBlocks * 2; n < req.Periods; n++ {
		task := base
		task.Lab = n < req.LabPeriods
		r.required[class.ID]++
		if err := r.place(task); err != nil {
			return err
		}
	}
	return nil
}

func (r *generationRun) place(task generationTask) error {
	placed, err := r.placeTask(task)
	if err != nil {
		return err
	}
	if !placed {
		r.unplaced = append(r.unplaced, task)
	}
	return nil
}

// save writes a draft timetable for the class when anything was placed.
func (r *generationRun) save(class generationClass, actor uuid.UUID, blocks []blockPlacement) error {
	res := &r.result.Classes[r.indexes[class.ID]]
	res.Required = r.required[class.ID]
	for _, placement := range r.placements[class.ID] {
		res.Placed += len(placement.slots)
	}
	res.Placed += len(blocks)
	if res.Placed == 0 {
		return nil
	}
	draft, err := r.store.create(r.ctx, r.request.AcademicYearID, class.ID, actor, nil)
	if err != nil {
		return err
	}
	res.TimetableID = &draft.ID
	for _, placement := range r.placements[class.ID] {
		for _, slot := range placement.slots {
			if err := r.store.upsertGeneratedEntry(r.ctx, draft.ID, slot.Day, slot.Period, placement.task.SubjectID, placement.task.TeacherID, placement.classroom); err != nil {
				return err
			}
		}
	}
	for _, bp := range blocks {
		if err := r.store.upsertBlockEntry(r.ctx, draft.ID, bp.Slot.Day, bp.Slot.Period, bp.BlockID); err != nil {
			return err
		}
	}
	return nil
}

// placeTask puts a lesson, or a double, at the first free period in a stable shuffled order,
// preferring a day the subject is not yet taught.
func (r *generationRun) placeTask(task generationTask) (bool, error) {
	var labs []Classroom
	if task.Lab {
		var err error
		if labs, err = r.store.labsForSubject(r.ctx, task.SubjectID); err != nil {
			return false, err
		}
	}
	if r.usedDays[task.ClassID] == nil {
		r.usedDays[task.ClassID] = map[uuid.UUID]map[int16]bool{}
	}
	if r.usedDays[task.ClassID][task.SubjectID] == nil {
		r.usedDays[task.ClassID][task.SubjectID] = map[int16]bool{}
	}
	used := r.usedDays[task.ClassID][task.SubjectID]
	var candidates [][]generationSlot
	if task.Double {
		for _, pair := range shuffledGenerationDoubles(r.doubles, task.ClassID, task.SubjectID) {
			candidates = append(candidates, []generationSlot{pair[0], pair[1]})
		}
	} else {
		for _, slot := range shuffledGenerationSlots(r.grid.slots, task.ClassID, task.SubjectID) {
			candidates = append(candidates, []generationSlot{slot})
		}
	}
	for _, freshDay := range []bool{true, false} {
		for _, slots := range candidates {
			if freshDay && used[slots[0].Day] {
				continue
			}
			if r.tryPlace(task, labs, slots) {
				return true, nil
			}
		}
	}
	return false, nil
}

// freeRoom reports whether the class and teacher are free at the slot, and which room the lesson would use.
func (r *generationRun) freeRoom(task generationTask, labs []Classroom, slot generationSlot) (*uuid.UUID, bool) {
	g := r.grid
	if g.classBusy[task.ClassID][slot] || g.teacherBusy[task.TeacherID][slot] || g.teacherUnavailable[task.TeacherID][slot] {
		return nil, false
	}
	if task.Lab {
		for _, lab := range labs {
			if !g.classroomBusy[lab.ID][slot] {
				id := lab.ID
				return &id, true
			}
		}
		return nil, false
	}
	if task.HomeClassroomID != nil && g.classroomBusy[*task.HomeClassroomID][slot] {
		return nil, false
	}
	return task.HomeClassroomID, true
}

// tryPlace books the slots when all are free in the same room.
func (r *generationRun) tryPlace(task generationTask, labs []Classroom, slots []generationSlot) bool {
	classroom, ok := r.freeRoom(task, labs, slots[0])
	if !ok {
		return false
	}
	if len(slots) == 2 {
		next, ok := r.freeRoom(task, labs, slots[1])
		if !ok || (classroom != nil && (next == nil || *classroom != *next)) {
			return false
		}
	}
	for _, slot := range slots {
		markGenerationBusy(r.grid.classBusy, task.ClassID, slot)
		markGenerationBusy(r.grid.teacherBusy, task.TeacherID, slot)
		if classroom != nil {
			markGenerationBusy(r.grid.classroomBusy, *classroom, slot)
		}
	}
	r.usedDays[task.ClassID][task.SubjectID][slots[0].Day] = true
	r.placements[task.ClassID] = append(r.placements[task.ClassID], generationPlacement{task: task, slots: slots, classroom: classroom})
	return true
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
			apierror.Respond(c, err)
			return
		}
		c.JSON(200, result)
	})
}
