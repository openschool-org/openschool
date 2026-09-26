package workflows

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
	academicsmodule "github.com/openschool-org/openschool/internal/modules/academics"
	timetablemodule "github.com/openschool-org/openschool/internal/modules/timetable"
)

// Store is the module's only SQL adapter. Workflow definitions receive a pool-bound Store
// to read and propose, and a transaction-bound Store inside Apply and Revert.
type Store struct {
	pool *pgxpool.Pool
	q    *db.Queries
	tx   pgx.Tx
}

func NewStore(pool *pgxpool.Pool) *Store { return &Store{pool: pool, q: db.New(pool)} }

// inTx runs fn with a Store bound to one transaction, committing only if fn succeeds.
func (s *Store) inTx(ctx context.Context, fn func(tx *Store) error) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if err := fn(&Store{pool: s.pool, q: s.q.WithTx(tx), tx: tx}); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func pgUUID(id uuid.UUID) pgtype.UUID { return pgtype.UUID{Bytes: id, Valid: id != uuid.Nil} }

func optUUID(id *uuid.UUID) pgtype.UUID {
	if id == nil {
		return pgtype.UUID{}
	}
	return pgtype.UUID{Bytes: *id, Valid: true}
}

func fromPgUUID(v pgtype.UUID) *uuid.UUID {
	if !v.Valid {
		return nil
	}
	id := uuid.UUID(v.Bytes)
	return &id
}

func text(v pgtype.Text) string {
	if v.Valid {
		return v.String
	}
	return ""
}

// ---- Runs ----

// RunRecord is a stored run with its JSON columns decoded.
type RunRecord struct {
	ID          uuid.UUID       `json:"id"`
	WorkflowKey string          `json:"workflow_key"`
	ScopeKey    string          `json:"scope_key"`
	State       string          `json:"state"`
	Inputs      Inputs          `json:"inputs"`
	Proposal    Proposal        `json:"proposal"`
	Trace       []TraceStep     `json:"trace"`
	Snapshot    json.RawMessage `json:"-"`
	Summary     string          `json:"summary,omitempty"`
	Error       string          `json:"error,omitempty"`
	CreatedAt   string          `json:"created_at"`
	AppliedAt   string          `json:"applied_at,omitempty"`
}

func decodeRun(r db.WorkflowRun) (RunRecord, error) {
	out := RunRecord{ID: r.ID, WorkflowKey: r.WorkflowKey, ScopeKey: r.ScopeKey, State: r.State, Summary: text(r.Summary), Error: text(r.Error), Snapshot: r.Snapshot}
	if err := json.Unmarshal(r.Inputs, &out.Inputs); err != nil {
		return out, err
	}
	if err := json.Unmarshal(r.Proposal, &out.Proposal); err != nil {
		return out, err
	}
	if err := json.Unmarshal(r.Trace, &out.Trace); err != nil {
		return out, err
	}
	out.CreatedAt = r.CreatedAt.Time.Format("2006-01-02T15:04:05Z07:00")
	if r.AppliedAt.Valid {
		out.AppliedAt = r.AppliedAt.Time.Format("2006-01-02T15:04:05Z07:00")
	}
	return out, nil
}

func (s *Store) createRun(ctx context.Context, key, scope string, in Inputs, p Proposal, trace []TraceStep, summary string, actor uuid.UUID) (RunRecord, error) {
	inputs, _ := json.Marshal(in)
	proposal, _ := json.Marshal(p)
	steps, _ := json.Marshal(trace)
	if err := s.q.DiscardOpenWorkflowRuns(ctx, db.DiscardOpenWorkflowRunsParams{WorkflowKey: key, ScopeKey: scope}); err != nil {
		return RunRecord{}, err
	}
	row, err := s.q.CreateWorkflowRun(ctx, db.CreateWorkflowRunParams{WorkflowKey: key, ScopeKey: scope, Inputs: inputs, Proposal: proposal, Trace: steps, Summary: pgtype.Text{String: summary, Valid: summary != ""}, CreatedBy: pgUUID(actor)})
	if err != nil {
		return RunRecord{}, err
	}
	return decodeRun(row)
}

func (s *Store) getRun(ctx context.Context, id uuid.UUID, lock bool) (RunRecord, error) {
	var row db.WorkflowRun
	var err error
	if lock {
		row, err = s.q.GetWorkflowRunForUpdate(ctx, id)
	} else {
		row, err = s.q.GetWorkflowRun(ctx, id)
	}
	if err != nil {
		return RunRecord{}, err
	}
	return decodeRun(row)
}

func (s *Store) saveProposal(ctx context.Context, id uuid.UUID, p Proposal) error {
	data, _ := json.Marshal(p)
	return s.q.UpdateWorkflowRunProposal(ctx, db.UpdateWorkflowRunProposalParams{ID: id, Proposal: data})
}

func (s *Store) markApplied(ctx context.Context, id uuid.UUID, snapshot json.RawMessage, trace []TraceStep, summary string, actor uuid.UUID) error {
	steps, _ := json.Marshal(trace)
	return s.q.MarkWorkflowRunApplied(ctx, db.MarkWorkflowRunAppliedParams{ID: id, Snapshot: snapshot, Trace: steps, Summary: pgtype.Text{String: summary, Valid: summary != ""}, AppliedBy: pgUUID(actor)})
}

func (s *Store) markState(ctx context.Context, id uuid.UUID, state string) error {
	return s.q.MarkWorkflowRunState(ctx, db.MarkWorkflowRunStateParams{ID: id, State: state})
}

// RunSummary is one row of a workflow's run history.
type RunSummary struct {
	ID            uuid.UUID `json:"id"`
	State         string    `json:"state"`
	Summary       string    `json:"summary,omitempty"`
	Error         string    `json:"error,omitempty"`
	CreatedAt     string    `json:"created_at"`
	AppliedAt     string    `json:"applied_at,omitempty"`
	CreatedByName string    `json:"created_by_name,omitempty"`
	AppliedByName string    `json:"applied_by_name,omitempty"`
}

func (s *Store) listRuns(ctx context.Context, key string) ([]RunSummary, error) {
	rows, err := s.q.ListWorkflowRuns(ctx, key)
	if err != nil {
		return nil, err
	}
	out := make([]RunSummary, len(rows))
	for i, r := range rows {
		out[i] = RunSummary{ID: r.ID, State: r.State, Summary: text(r.Summary), Error: text(r.Error), CreatedAt: r.CreatedAt.Time.Format("2006-01-02T15:04:05Z07:00"), CreatedByName: text(r.CreatedByName), AppliedByName: text(r.AppliedByName)}
		if r.AppliedAt.Valid {
			out[i].AppliedAt = r.AppliedAt.Time.Format("2006-01-02T15:04:05Z07:00")
		}
	}
	return out, nil
}

func (s *Store) latestRuns(ctx context.Context) (map[string]RunSummary, error) {
	rows, err := s.q.LatestWorkflowRuns(ctx)
	if err != nil {
		return nil, err
	}
	out := make(map[string]RunSummary, len(rows))
	for _, r := range rows {
		rs := RunSummary{ID: r.ID, State: r.State, Summary: text(r.Summary), CreatedAt: r.CreatedAt.Time.Format("2006-01-02T15:04:05Z07:00")}
		if r.AppliedAt.Valid {
			rs.AppliedAt = r.AppliedAt.Time.Format("2006-01-02T15:04:05Z07:00")
		}
		out[r.WorkflowKey] = rs
	}
	return out, nil
}

// ---- Domain reads and writes used by the workflow tools ----

type Year struct {
	ID         uuid.UUID
	Label      string
	Start, End time.Time
	Current    bool
}

type YearClass struct {
	ID, GradeID                                       uuid.UUID
	Name, GradeName                                   string
	GradeOrder                                        int32
	StreamID, StreamGroupID, MediumID, HomeroomID     *uuid.UUID
	FormTeacherID                                     *uuid.UUID
	StreamName, StreamGroupName, MediumName, Homeroom string
	Capacity, Students                                int32
}

type TermInfo struct {
	ID         uuid.UUID
	Name       string
	Start, End time.Time
	Sort       int32
	Current    bool
}

type GradeInfo struct {
	ID    uuid.UUID
	Name  string
	Order int32
}

func (s *Store) years(ctx context.Context) ([]Year, error) {
	rows, err := s.q.WfListAcademicYears(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]Year, len(rows))
	for i, r := range rows {
		out[i] = Year{ID: r.ID, Label: r.Label, Start: r.StartDate.Time, End: r.EndDate.Time, Current: r.IsCurrent}
	}
	return out, nil
}

func (s *Store) year(ctx context.Context, id uuid.UUID) (Year, error) {
	r, err := s.q.WfGetAcademicYear(ctx, id)
	return Year{ID: r.ID, Label: r.Label, Start: r.StartDate.Time, End: r.EndDate.Time, Current: r.IsCurrent}, err
}

func (s *Store) labelExists(ctx context.Context, label string) (bool, error) {
	return s.q.WfAcademicYearLabelExists(ctx, label)
}

func (s *Store) yearClasses(ctx context.Context, year uuid.UUID) ([]YearClass, error) {
	rows, err := s.q.WfListYearClasses(ctx, year)
	if err != nil {
		return nil, err
	}
	out := make([]YearClass, len(rows))
	for i, r := range rows {
		out[i] = YearClass{
			ID: r.ID, GradeID: r.GradeID, Name: r.Name, GradeName: r.GradeName, GradeOrder: r.GradeOrder,
			StreamID: fromPgUUID(r.StreamID), StreamGroupID: fromPgUUID(r.StreamGroupID), MediumID: fromPgUUID(r.MediumID),
			HomeroomID: fromPgUUID(r.HomeClassroomID), FormTeacherID: fromPgUUID(r.FormTeacherID),
			StreamName: text(r.StreamName), StreamGroupName: text(r.StreamGroupName), MediumName: text(r.MediumName), Homeroom: text(r.HomeroomName),
			Capacity: r.Capacity, Students: r.StudentCount,
		}
	}
	return out, nil
}

func (s *Store) terms(ctx context.Context, year uuid.UUID) ([]TermInfo, error) {
	rows, err := s.q.WfListTerms(ctx, year)
	if err != nil {
		return nil, err
	}
	out := make([]TermInfo, len(rows))
	for i, r := range rows {
		out[i] = TermInfo{ID: r.ID, Name: r.Name, Start: r.StartDate.Time, End: r.EndDate.Time, Sort: r.SortOrder, Current: r.IsCurrent}
	}
	return out, nil
}

func (s *Store) grades(ctx context.Context) ([]GradeInfo, error) {
	rows, err := s.q.WfListGrades(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]GradeInfo, len(rows))
	for i, r := range rows {
		out[i] = GradeInfo{ID: r.ID, Name: r.Name, Order: r.SortOrder}
	}
	return out, nil
}

func pgDate(t time.Time) pgtype.Date { return pgtype.Date{Time: t, Valid: true} }

func (s *Store) createYear(ctx context.Context, label string, start, end time.Time) (uuid.UUID, error) {
	return s.q.WfCreateAcademicYear(ctx, db.WfCreateAcademicYearParams{Label: label, StartDate: pgDate(start), EndDate: pgDate(end)})
}

func (s *Store) createTerm(ctx context.Context, year uuid.UUID, name string, start, end time.Time, sort int32) error {
	return s.q.WfCreateTerm(ctx, db.WfCreateTermParams{AcademicYearID: year, Name: name, StartDate: pgDate(start), EndDate: pgDate(end), SortOrder: sort})
}

// createClass creates a class, keeping the given homeroom or applying the shared homeroom rule.
func (s *Store) createClass(ctx context.Context, year uuid.UUID, c YearClass) (uuid.UUID, error) {
	room := optUUID(c.HomeroomID)
	if !room.Valid {
		var err error
		if room, err = academicsmodule.EnsureHomeroom(ctx, s.q, c.Name); err != nil {
			return uuid.Nil, err
		}
	}
	return s.q.WfCreateClass(ctx, db.WfCreateClassParams{
		GradeID: c.GradeID, AcademicYearID: year, Name: c.Name, StreamID: optUUID(c.StreamID), StreamGroupID: optUUID(c.StreamGroupID),
		MediumID: optUUID(c.MediumID), HomeClassroomID: room, FormTeacherID: optUUID(c.FormTeacherID), Capacity: c.Capacity,
	})
}

// TimetableSetupCounts reports what copyTimetableSetup copied.
type TimetableSetupCounts struct{ Sections, SubjectHours, Settings, SectionHeads int64 }

// copyTimetableSetup copies grade sections with their grades and period grids, subject hours, settings and section heads.
func (s *Store) copyTimetableSetup(ctx context.Context, from, to uuid.UUID) (TimetableSetupCounts, error) {
	var out TimetableSetupCounts
	sections, err := s.q.WfListGradeSections(ctx, from)
	if err != nil {
		return out, err
	}
	for _, sec := range sections {
		id, err := s.q.WfCreateGradeSection(ctx, db.WfCreateGradeSectionParams{AcademicYearID: to, Name: sec.Name, IntervalStartTime: sec.IntervalStartTime, IntervalEndTime: sec.IntervalEndTime, SectionHeadTeacherID: sec.SectionHeadTeacherID, SortOrder: sec.SortOrder})
		if err != nil {
			return out, err
		}
		if err := s.q.WfCopyGradeSectionGrades(ctx, db.WfCopyGradeSectionGradesParams{NewSection: id, NewYear: to, OldSection: sec.ID}); err != nil {
			return out, err
		}
		if err := s.q.WfCopyTimetablePeriods(ctx, db.WfCopyTimetablePeriodsParams{NewSection: id, OldSection: sec.ID}); err != nil {
			return out, err
		}
		out.Sections++
	}
	if out.SubjectHours, err = s.q.WfCopySubjectPeriodRequirements(ctx, db.WfCopySubjectPeriodRequirementsParams{NewYear: to, OldYear: from}); err != nil {
		return out, err
	}
	if out.Settings, err = s.q.WfCopyTimetableSettings(ctx, db.WfCopyTimetableSettingsParams{NewYear: to, OldYear: from}); err != nil {
		return out, err
	}
	if out.SectionHeads, err = s.q.WfCopySectionHeads(ctx, db.WfCopySectionHeadsParams{NewYear: to, OldYear: from}); err != nil {
		return out, err
	}
	return out, nil
}

func (s *Store) sectionCount(ctx context.Context, year uuid.UUID) (int, error) {
	rows, err := s.q.WfListGradeSections(ctx, year)
	return len(rows), err
}

func (s *Store) yearHasActivity(ctx context.Context, year uuid.UUID) (bool, error) {
	return s.q.WfYearHasActivity(ctx, year)
}

func (s *Store) deleteYear(ctx context.Context, year uuid.UUID) error {
	if err := s.q.WfDeleteYearClasses(ctx, year); err != nil {
		return err
	}
	return s.q.WfDeleteAcademicYear(ctx, year)
}

// LeaverCandidate is an active student in one of the chosen grades.
type LeaverCandidate struct {
	ID                                uuid.UUID
	Name, Index, ClassName, GradeName string
	GradeID                           uuid.UUID
	GradeOrder                        int32
}

func (s *Store) activeStudentsInGrades(ctx context.Context, year uuid.UUID, grades []uuid.UUID) ([]LeaverCandidate, error) {
	rows, err := s.q.WfListActiveStudentsInGrades(ctx, db.WfListActiveStudentsInGradesParams{Year: year, GradeIds: grades})
	if err != nil {
		return nil, err
	}
	out := make([]LeaverCandidate, len(rows))
	for i, r := range rows {
		out[i] = LeaverCandidate{ID: r.ID, Name: r.FullName, Index: r.IndexNumber, ClassName: r.ClassName, GradeName: r.GradeName, GradeID: r.GradeID, GradeOrder: r.GradeOrder}
	}
	return out, nil
}

func (s *Store) markLeft(ctx context.Context, ids []uuid.UUID, at time.Time) (int64, error) {
	return s.q.WfMarkStudentsLeft(ctx, db.WfMarkStudentsLeftParams{Ids: ids, LeftAt: pgtype.Timestamptz{Time: at, Valid: true}})
}

func (s *Store) restoreActive(ctx context.Context, ids []uuid.UUID) (int64, error) {
	return s.q.WfRestoreStudentsActive(ctx, ids)
}

// Readiness summarises a year before it goes live.
type Readiness struct{ Classes, Students, PublishedTimetables, Terms int32 }

func (s *Store) readiness(ctx context.Context, year uuid.UUID) (Readiness, error) {
	r, err := s.q.WfYearReadiness(ctx, year)
	return Readiness{Classes: r.Classes, Students: r.Students, PublishedTimetables: r.PublishedTimetables, Terms: r.Terms}, err
}

func (s *Store) currentTerm(ctx context.Context) (*uuid.UUID, error) {
	id, err := s.q.WfCurrentTerm(ctx)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return &id, err
}

func (s *Store) setCurrentYear(ctx context.Context, year uuid.UUID) error {
	return s.q.WfSetCurrentYear(ctx, year)
}

func (s *Store) setCurrentTerm(ctx context.Context, term uuid.UUID) error {
	return s.q.WfSetCurrentTerm(ctx, term)
}

// ---- W5 promotion and W4 intake ----

// PromotionCandidate is a student moving into a new grade: from a current class, or from intake.
type PromotionCandidate struct {
	ID                                      uuid.UUID
	Name, Index, Gender, HouseID, ClassName string
	MediumID                                string
	FromGradeID                             uuid.UUID
	IntakeGradeID                           *uuid.UUID // set for admitted students, who go straight into this grade
}

func (s *Store) promotionStudents(ctx context.Context, year uuid.UUID) ([]PromotionCandidate, error) {
	rows, err := s.q.WfPromotionStudents(ctx, year)
	if err != nil {
		return nil, err
	}
	out := make([]PromotionCandidate, len(rows))
	for i, r := range rows {
		out[i] = PromotionCandidate{ID: r.ID, Name: r.FullName, Index: r.IndexNumber, Gender: r.Gender, HouseID: r.HouseID, ClassName: r.ClassName, MediumID: r.MediumID, FromGradeID: r.GradeID}
	}
	return out, nil
}

func (s *Store) intakeStudents(ctx context.Context, year uuid.UUID) ([]PromotionCandidate, error) {
	rows, err := s.q.WfIntakeStudents(ctx, year)
	if err != nil {
		return nil, err
	}
	out := make([]PromotionCandidate, len(rows))
	for i, r := range rows {
		grade := r.GradeID
		out[i] = PromotionCandidate{ID: r.ID, Name: r.FullName, Index: r.IndexNumber, Gender: r.Gender, HouseID: r.HouseID, ClassName: "New admission", MediumID: r.MediumID, IntakeGradeID: &grade}
	}
	return out, nil
}

func (s *Store) targetOccupancy(ctx context.Context, year uuid.UUID, exclude []uuid.UUID) (map[uuid.UUID]int, error) {
	rows, err := s.q.WfTargetOccupancy(ctx, db.WfTargetOccupancyParams{Year: year, Exclude: exclude})
	if err != nil {
		return nil, err
	}
	out := make(map[uuid.UUID]int, len(rows))
	for _, r := range rows {
		out[r.ClassID] = int(r.Taken)
	}
	return out, nil
}

// StudentChoice summarises a student's next-year subjects for placement.
type StudentChoice struct {
	Key, Label              string // optional subjects only, sorted
	StreamID, StreamGroupID string
	Subjects                int
}

func (s *Store) studentChoices(ctx context.Context, year uuid.UUID, ids []uuid.UUID) (map[uuid.UUID]StudentChoice, error) {
	rows, err := s.q.WfStudentChoices(ctx, db.WfStudentChoicesParams{Year: year, Ids: ids})
	if err != nil {
		return nil, err
	}
	out := map[uuid.UUID]StudentChoice{}
	for _, r := range rows {
		c := out[r.StudentID]
		c.Subjects++
		if r.StreamID != "" {
			c.StreamID, c.StreamGroupID = r.StreamID, r.StreamGroupID
		}
		if r.IsChoice {
			if c.Key != "" {
				c.Key += "+"
				c.Label += ", "
			}
			c.Key += r.SubjectID.String()
			c.Label += r.SubjectName
		}
		out[r.StudentID] = c
	}
	return out, nil
}

// PolicySetting is the stored rule for one grade move.
type PolicySetting struct {
	Policy        string
	SpreadByMarks bool
}

func (s *Store) policies(ctx context.Context) (map[uuid.UUID]PolicySetting, error) {
	rows, err := s.q.WfPromotionPolicies(ctx)
	if err != nil {
		return nil, err
	}
	out := make(map[uuid.UUID]PolicySetting, len(rows))
	for _, r := range rows {
		out[r.FromGradeID] = PolicySetting{Policy: r.Policy, SpreadByMarks: r.SpreadByMarks}
	}
	return out, nil
}

func (s *Store) savePolicy(ctx context.Context, grade uuid.UUID, p PolicySetting) error {
	return s.q.WfUpsertPromotionPolicy(ctx, db.WfUpsertPromotionPolicyParams{FromGradeID: grade, Policy: p.Policy, SpreadByMarks: p.SpreadByMarks})
}

func (s *Store) gradesWithChoice(ctx context.Context) (map[uuid.UUID]bool, error) {
	ids, err := s.q.WfGradesWithChoiceGroups(ctx)
	if err != nil {
		return nil, err
	}
	out := make(map[uuid.UUID]bool, len(ids))
	for _, id := range ids {
		out[id] = true
	}
	return out, nil
}

func (s *Store) latestAverages(ctx context.Context, year uuid.UUID, ids []uuid.UUID) (map[uuid.UUID]float64, error) {
	rows, err := s.q.WfLatestAverages(ctx, db.WfLatestAveragesParams{Year: year, Ids: ids})
	if err != nil {
		return nil, err
	}
	out := make(map[uuid.UUID]float64, len(rows))
	for _, r := range rows {
		out[r.StudentID] = r.Average
	}
	return out, nil
}

// Assignment is one student's class in a year.
type Assignment struct {
	StudentID uuid.UUID `json:"student_id"`
	ClassID   uuid.UUID `json:"class_id"`
}

func (s *Store) yearAssignments(ctx context.Context, year uuid.UUID, ids []uuid.UUID) ([]Assignment, error) {
	rows, err := s.q.WfYearAssignments(ctx, db.WfYearAssignmentsParams{Year: year, Ids: ids})
	if err != nil {
		return nil, err
	}
	out := make([]Assignment, len(rows))
	for i, r := range rows {
		out[i] = Assignment{StudentID: r.StudentID, ClassID: r.ClassID}
	}
	return out, nil
}

// reassign clears these students' classes for the year, then writes the given assignments.
func (s *Store) reassign(ctx context.Context, year uuid.UUID, clear []uuid.UUID, assignments []Assignment) error {
	if err := s.q.BulkDeleteClassStudentsForYear(ctx, db.BulkDeleteClassStudentsForYearParams{AcademicYearID: year, StudentIds: clear}); err != nil {
		return err
	}
	if len(assignments) == 0 {
		return nil
	}
	classes := make([]uuid.UUID, len(assignments))
	students := make([]uuid.UUID, len(assignments))
	for i, a := range assignments {
		classes[i], students[i] = a.ClassID, a.StudentID
	}
	return s.q.BulkInsertClassStudents(ctx, db.BulkInsertClassStudentsParams{ClassIds: classes, StudentIds: students})
}

func (s *Store) classesHaveRecords(ctx context.Context, year uuid.UUID, classes, students []uuid.UUID) (bool, error) {
	return s.q.WfClassesHaveRecords(ctx, db.WfClassesHaveRecordsParams{Year: year, ClassIds: classes, StudentIds: students})
}

func (s *Store) deleteEmptyClasses(ctx context.Context, ids []uuid.UUID) error {
	return s.q.WfDeleteEmptyClasses(ctx, ids)
}

// Intake is a pending admission, kept in snapshots so revert can put it back.
type Intake struct {
	StudentID uuid.UUID  `json:"student_id"`
	YearID    uuid.UUID  `json:"year_id"`
	GradeID   uuid.UUID  `json:"grade_id"`
	MediumID  *uuid.UUID `json:"medium_id,omitempty"`
}

func (s *Store) intakesByIDs(ctx context.Context, ids []uuid.UUID) ([]Intake, error) {
	rows, err := s.q.WfIntakesByIDs(ctx, ids)
	if err != nil {
		return nil, err
	}
	out := make([]Intake, len(rows))
	for i, r := range rows {
		out[i] = Intake{StudentID: r.StudentID, YearID: r.AcademicYearID, GradeID: r.GradeID, MediumID: fromPgUUID(r.MediumID)}
	}
	return out, nil
}

func (s *Store) deleteIntakes(ctx context.Context, ids []uuid.UUID) error {
	return s.q.WfDeleteIntakes(ctx, ids)
}

func (s *Store) restoreIntake(ctx context.Context, in Intake) error {
	return s.q.WfRestoreIntake(ctx, db.WfRestoreIntakeParams{StudentID: in.StudentID, AcademicYearID: in.YearID, GradeID: in.GradeID, MediumID: optUUID(in.MediumID)})
}

func (s *Store) gradesWithStreams(ctx context.Context) (map[uuid.UUID]bool, error) {
	ids, err := s.q.WfGradesWithStreamLevels(ctx)
	if err != nil {
		return nil, err
	}
	out := make(map[uuid.UUID]bool, len(ids))
	for _, id := range ids {
		out[id] = true
	}
	return out, nil
}

// ---- W4 intake ----

type MediumInfo struct {
	ID   uuid.UUID
	Name string
}

func (s *Store) mediums(ctx context.Context) ([]MediumInfo, error) {
	rows, err := s.q.WfListMediums(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]MediumInfo, len(rows))
	for i, r := range rows {
		out[i] = MediumInfo{ID: r.ID, Name: r.Name}
	}
	return out, nil
}

// schoolType returns boys, girls, mixed or "" when the school row is not set up yet.
func (s *Store) schoolType(ctx context.Context) (string, error) {
	t, err := s.q.WfSchoolType(ctx)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil
	}
	return t, err
}

func (s *Store) existingIndexNumbers(ctx context.Context, numbers []string) (map[string]bool, error) {
	rows, err := s.q.WfExistingIndexNumbers(ctx, numbers)
	if err != nil {
		return nil, err
	}
	out := make(map[string]bool, len(rows))
	for _, n := range rows {
		out[n] = true
	}
	return out, nil
}

// guardiansByNIC maps each NIC already on record to that guardian.
func (s *Store) guardiansByNIC(ctx context.Context, nics []string) (map[string]db.WfGuardiansByNICRow, error) {
	rows, err := s.q.WfGuardiansByNIC(ctx, nics)
	if err != nil {
		return nil, err
	}
	out := make(map[string]db.WfGuardiansByNICRow, len(rows))
	for _, r := range rows {
		out[r.NicNumber] = r
	}
	return out, nil
}

func optText(v string) pgtype.Text { return pgtype.Text{String: v, Valid: v != ""} }

// NewStudent is one imported student with their first guardian.
type NewStudent struct {
	Name, Index, Gender, Address, Phone string
	GuardianName, Relationship          string
	GuardianPhone, GuardianNIC          string
	GuardianEmail                       string
}

// leastUsedHouse returns nil when the school has no houses.
func (s *Store) leastUsedHouse(ctx context.Context) (pgtype.UUID, error) {
	id, err := s.q.WfLeastUsedHouse(ctx)
	if errors.Is(err, pgx.ErrNoRows) {
		return pgtype.UUID{}, nil
	}
	return pgUUID(id), err
}

func (s *Store) createIntakeStudent(ctx context.Context, st NewStudent) (uuid.UUID, error) {
	house, err := s.leastUsedHouse(ctx)
	if err != nil {
		return uuid.Nil, err
	}
	return s.q.WfCreateIntakeStudent(ctx, db.WfCreateIntakeStudentParams{FullName: st.Name, IndexNumber: st.Index, Address: optText(st.Address), Phone: optText(st.Phone), Gender: optText(st.Gender), HouseID: house})
}

func (s *Store) createGuardian(ctx context.Context, st NewStudent) (uuid.UUID, error) {
	return s.q.WfCreateGuardian(ctx, db.WfCreateGuardianParams{FullName: st.GuardianName, Relationship: st.Relationship, Phone: st.GuardianPhone, Email: optText(st.GuardianEmail), NicNumber: st.GuardianNIC})
}

func (s *Store) linkGuardian(ctx context.Context, student, guardian uuid.UUID) error {
	return s.q.WfLinkGuardian(ctx, db.WfLinkGuardianParams{StudentID: student, GuardianID: guardian})
}

func (s *Store) createIntake(ctx context.Context, in Intake) error {
	return s.q.WfCreateIntake(ctx, db.WfCreateIntakeParams{StudentID: in.StudentID, AcademicYearID: in.YearID, GradeID: in.GradeID, MediumID: optUUID(in.MediumID)})
}

func (s *Store) studentsInUse(ctx context.Context, ids []uuid.UUID) (bool, error) {
	return s.q.WfStudentsInUse(ctx, ids)
}

// deleteImported removes imported students and any guardian of theirs that is now linked to nobody.
func (s *Store) deleteImported(ctx context.Context, students, guardians []uuid.UUID) error {
	if err := s.q.WfDeleteStudents(ctx, students); err != nil {
		return err
	}
	return s.q.WfDeleteUnlinkedGuardians(ctx, guardians)
}

func (s *Store) studentsWithoutAccount(ctx context.Context, numbers []string) ([]db.WfStudentsWithoutAccountRow, error) {
	return s.q.WfStudentsWithoutAccount(ctx, numbers)
}

func (s *Store) createStudentUser(ctx context.Context, id uuid.UUID, email, name string) error {
	_, err := s.q.CreateUser(ctx, db.CreateUserParams{ID: id, Email: email, FullName: name, Role: "student", MustChangePassword: true})
	return err
}

func (s *Store) setStudentUser(ctx context.Context, student, user uuid.UUID) error {
	return s.q.WfSetStudentUser(ctx, db.WfSetStudentUserParams{ID: student, UserID: pgUUID(user)})
}

func (s *Store) deleteUser(ctx context.Context, id uuid.UUID) error {
	return s.q.DeleteUser(ctx, id)
}

// ---- W3 subject choices ----

// LevelInfo is a curriculum level tied to a grade.
type LevelInfo struct {
	ID, GradeID      uuid.UUID
	Label, GradeName string
}

func (s *Store) gradeLevels(ctx context.Context) ([]LevelInfo, error) {
	rows, err := s.q.WfLevelsForGrades(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]LevelInfo, len(rows))
	for i, r := range rows {
		out[i] = LevelInfo{ID: r.ID, GradeID: r.GradeID, Label: r.Label, GradeName: r.GradeName}
	}
	return out, nil
}

// ChoiceGroup is one selection group of a level with the subjects it offers.
type ChoiceGroup struct {
	ID       uuid.UUID
	Label    string
	Min, Max int
	Subjects []Option // value is the subject id
	Codes    map[string]uuid.UUID
}

// Fixed reports whether every subject in the group is taken, leaving nothing to choose.
func (g ChoiceGroup) Fixed() bool { return len(g.Subjects) <= g.Min }

func (s *Store) levelGroups(ctx context.Context, level uuid.UUID) ([]ChoiceGroup, error) {
	rows, err := s.q.WfLevelGroupSubjects(ctx, level)
	if err != nil {
		return nil, err
	}
	var out []ChoiceGroup
	for _, r := range rows {
		if len(out) == 0 || out[len(out)-1].ID != r.GroupID {
			out = append(out, ChoiceGroup{ID: r.GroupID, Label: r.GroupLabel, Min: int(r.MinSelect), Max: int(r.MaxSelect), Codes: map[string]uuid.UUID{}})
		}
		g := &out[len(out)-1]
		g.Subjects = append(g.Subjects, Option{Value: r.SubjectID.String(), Label: r.SubjectName})
		g.Codes[normalise(r.SubjectName)] = r.SubjectID
		if r.SubjectCode != "" {
			g.Codes[normalise(r.SubjectCode)] = r.SubjectID
		}
	}
	return out, nil
}

// Enrollment is one stored subject enrolment, kept in snapshots for revert.
type Enrollment struct {
	StudentID uuid.UUID  `json:"student_id"`
	GroupID   uuid.UUID  `json:"group_id"`
	SubjectID uuid.UUID  `json:"subject_id"`
	MediumID  *uuid.UUID `json:"medium_id,omitempty"`
	LevelID   uuid.UUID  `json:"level_id"`
}

func (s *Store) yearEnrollments(ctx context.Context, year uuid.UUID, ids []uuid.UUID) ([]Enrollment, error) {
	rows, err := s.q.WfYearEnrollments(ctx, db.WfYearEnrollmentsParams{Year: year, Ids: ids})
	if err != nil {
		return nil, err
	}
	out := make([]Enrollment, len(rows))
	for i, r := range rows {
		out[i] = Enrollment{StudentID: r.StudentID, GroupID: r.GroupID, SubjectID: r.SubjectID, MediumID: fromPgUUID(r.MediumID), LevelID: r.LevelID}
	}
	return out, nil
}

func (s *Store) lockedStudents(ctx context.Context, year, level uuid.UUID, ids []uuid.UUID) (map[uuid.UUID]bool, error) {
	rows, err := s.q.WfEnrollmentLocks(ctx, db.WfEnrollmentLocksParams{Year: year, Level: level, Ids: ids})
	if err != nil {
		return nil, err
	}
	out := make(map[uuid.UUID]bool, len(rows))
	for _, id := range rows {
		out[id] = true
	}
	return out, nil
}

// replaceLevelEnrollments clears these students' subjects in the level for the year and writes the given ones.
func (s *Store) replaceLevelEnrollments(ctx context.Context, year, level uuid.UUID, ids []uuid.UUID, rows []Enrollment) error {
	if err := s.q.WfDeleteLevelEnrollments(ctx, db.WfDeleteLevelEnrollmentsParams{Year: year, Level: level, Ids: ids}); err != nil {
		return err
	}
	for _, e := range rows {
		if err := s.q.WfInsertEnrollment(ctx, db.WfInsertEnrollmentParams{StudentID: e.StudentID, AcademicYearID: year, GroupID: e.GroupID, SubjectID: e.SubjectID, MediumID: optUUID(e.MediumID)}); err != nil {
			return err
		}
	}
	return nil
}

// setLocks makes exactly the given students locked for the level, among ids.
func (s *Store) setLocks(ctx context.Context, year, level uuid.UUID, ids, locked []uuid.UUID) error {
	if err := s.q.WfClearLevelLocks(ctx, db.WfClearLevelLocksParams{Year: year, Level: level, Ids: ids}); err != nil {
		return err
	}
	if len(locked) == 0 {
		return nil
	}
	return s.q.WfSetLevelLocks(ctx, db.WfSetLevelLocksParams{Year: year, Level: level, Ids: locked})
}

func (s *Store) studentsHaveMarks(ctx context.Context, year uuid.UUID, ids []uuid.UUID) (bool, error) {
	return s.q.WfStudentsHaveMarks(ctx, db.WfStudentsHaveMarksParams{Year: year, Ids: ids})
}

// ---- W6 teacher allocation ----

// SubjectHours is one subject's weekly periods for a grade.
type SubjectHours struct {
	GradeID, SubjectID uuid.UUID
	SubjectName        string
	Periods            int
}

func (s *Store) subjectHours(ctx context.Context, year uuid.UUID) ([]SubjectHours, error) {
	rows, err := s.q.WfSubjectHours(ctx, year)
	if err != nil {
		return nil, err
	}
	out := make([]SubjectHours, len(rows))
	for i, r := range rows {
		out[i] = SubjectHours{GradeID: r.GradeID, SubjectID: r.SubjectID, SubjectName: r.SubjectName, Periods: int(r.PeriodsPerWeek)}
	}
	return out, nil
}

// TeacherInfo is an active teacher with the subjects they are qualified for.
type TeacherInfo struct {
	ID       uuid.UUID
	Name     string
	Subjects map[uuid.UUID]bool
}

func (s *Store) activeTeachers(ctx context.Context) ([]TeacherInfo, error) {
	rows, err := s.q.WfActiveTeachers(ctx)
	if err != nil {
		return nil, err
	}
	quals, err := s.q.WfTeacherSubjects(ctx)
	if err != nil {
		return nil, err
	}
	bySubject := map[uuid.UUID]map[uuid.UUID]bool{}
	for _, q := range quals {
		if bySubject[q.TeacherID] == nil {
			bySubject[q.TeacherID] = map[uuid.UUID]bool{}
		}
		bySubject[q.TeacherID][q.SubjectID] = true
	}
	out := make([]TeacherInfo, len(rows))
	for i, r := range rows {
		out[i] = TeacherInfo{ID: r.ID, Name: r.FullName, Subjects: bySubject[r.ID]}
		if out[i].Subjects == nil {
			out[i].Subjects = map[uuid.UUID]bool{}
		}
	}
	return out, nil
}

// SubjectTeacher is one class-subject-teacher assignment, kept in snapshots for revert.
type SubjectTeacher struct {
	ClassID   uuid.UUID `json:"class_id"`
	SubjectID uuid.UUID `json:"subject_id"`
	TeacherID uuid.UUID `json:"teacher_id"`
}

func (s *Store) yearSubjectTeachers(ctx context.Context, year uuid.UUID) ([]SubjectTeacher, error) {
	rows, err := s.q.WfYearSubjectTeachers(ctx, year)
	if err != nil {
		return nil, err
	}
	out := make([]SubjectTeacher, len(rows))
	for i, r := range rows {
		out[i] = SubjectTeacher{ClassID: r.ClassID, SubjectID: r.SubjectID, TeacherID: r.TeacherID}
	}
	return out, nil
}

func (s *Store) classPredecessors(ctx context.Context, source, target uuid.UUID) (map[uuid.UUID]uuid.UUID, error) {
	rows, err := s.q.WfClassPredecessors(ctx, db.WfClassPredecessorsParams{Source: source, Target: target})
	if err != nil {
		return nil, err
	}
	out := make(map[uuid.UUID]uuid.UUID, len(rows))
	for _, r := range rows {
		out[r.ClassID] = r.PreviousClassID
	}
	return out, nil
}

func (s *Store) setSubjectTeacher(ctx context.Context, class, subject uuid.UUID, teacher *uuid.UUID) error {
	if teacher == nil {
		return s.q.WfDeleteSubjectTeacher(ctx, db.WfDeleteSubjectTeacherParams{ClassID: class, SubjectID: subject})
	}
	return s.q.WfUpsertSubjectTeacher(ctx, db.WfUpsertSubjectTeacherParams{ClassID: class, SubjectID: subject, TeacherID: *teacher})
}

func (s *Store) setFormTeacher(ctx context.Context, class uuid.UUID, teacher *uuid.UUID) error {
	return s.q.WfSetFormTeacher(ctx, db.WfSetFormTeacherParams{ClassID: class, TeacherID: optUUID(teacher)})
}

func (s *Store) classesHaveSubmittedTimetables(ctx context.Context, ids []uuid.UUID) (bool, error) {
	return s.q.WfClassesHaveSubmittedTimetables(ctx, ids)
}

// ---- W7 timetable ----

// dryRun runs fn in a transaction that is always rolled back, so a proposal can show exactly
// what apply would write without writing it.
func (s *Store) dryRun(ctx context.Context, fn func(tx *Store) error) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	return fn(&Store{pool: s.pool, q: s.q.WithTx(tx), tx: tx})
}

// SectionInfo is a grade section of a year with its period grid size.
type SectionInfo struct {
	ID          uuid.UUID
	Name        string
	Periods     int
	HasHead     bool
	YearID      uuid.UUID
	YearLabel   string
	YearCurrent bool
}

func (s *Store) sections(ctx context.Context, year Year) ([]SectionInfo, error) {
	rows, err := s.q.WfListGradeSections(ctx, year.ID)
	if err != nil {
		return nil, err
	}
	counts, err := s.q.WfSectionPeriodCounts(ctx, year.ID)
	if err != nil {
		return nil, err
	}
	periods := map[uuid.UUID]int{}
	for _, c := range counts {
		periods[c.GradeSectionID] = int(c.Periods)
	}
	out := make([]SectionInfo, len(rows))
	for i, r := range rows {
		out[i] = SectionInfo{ID: r.ID, Name: r.Name, Periods: periods[r.ID], HasHead: r.SectionHeadTeacherID.Valid, YearID: year.ID, YearLabel: year.Label, YearCurrent: year.Current}
	}
	return out, nil
}

// SectionClass is a class with the grade section that generates its timetable.
type SectionClass struct {
	SectionID, ClassID, GradeID uuid.UUID
	ClassName, GradeName        string
	GradeOrder                  int32
}

func (s *Store) sectionClasses(ctx context.Context, year uuid.UUID) ([]SectionClass, error) {
	rows, err := s.q.WfSectionClasses(ctx, year)
	if err != nil {
		return nil, err
	}
	out := make([]SectionClass, len(rows))
	for i, r := range rows {
		out[i] = SectionClass{SectionID: r.GradeSectionID, ClassID: r.ClassID, GradeID: r.GradeID, ClassName: r.ClassName, GradeName: r.GradeName, GradeOrder: r.GradeOrder}
	}
	return out, nil
}

func (s *Store) subjectsMissingLabs(ctx context.Context, year uuid.UUID) ([]string, error) {
	return s.q.WfSubjectsMissingLabs(ctx, year)
}

func (s *Store) teachersWithAvailability(ctx context.Context, year uuid.UUID) (int, error) {
	n, err := s.q.WfTeacherAvailabilityCount(ctx, year)
	return int(n), err
}

func (s *Store) latestTimetableStatus(ctx context.Context, year uuid.UUID) (map[uuid.UUID]string, error) {
	rows, err := s.q.WfLatestTimetableStatus(ctx, year)
	if err != nil {
		return nil, err
	}
	out := make(map[uuid.UUID]string, len(rows))
	for _, r := range rows {
		out[r.ClassID] = r.Status
	}
	return out, nil
}

func (s *Store) groupClasses(ctx context.Context, year, group uuid.UUID) ([]uuid.UUID, error) {
	return s.q.WfGroupClasses(ctx, db.WfGroupClassesParams{Year: year, GroupID: group})
}

// BlockDef is an option block's definition, kept in snapshots so revert can recreate it.
type BlockDef struct {
	ID       uuid.UUID   `json:"id"`
	GradeID  uuid.UUID   `json:"grade_id"`
	Name     string      `json:"name"`
	Periods  int32       `json:"periods"`
	Subjects []uuid.UUID `json:"subjects"`
	Classes  []uuid.UUID `json:"classes"`
}

func (s *Store) optionBlocksForYear(ctx context.Context, year uuid.UUID) ([]BlockDef, error) {
	rows, err := s.q.ListOptionBlocksForYear(ctx, year)
	if err != nil || len(rows) == 0 {
		return nil, err
	}
	ids := make([]uuid.UUID, len(rows))
	out := make([]BlockDef, len(rows))
	index := map[uuid.UUID]int{}
	for i, r := range rows {
		ids[i] = r.ID
		index[r.ID] = i
		out[i] = BlockDef{ID: r.ID, GradeID: r.GradeID, Name: r.Name, Periods: r.PeriodsPerWeek}
	}
	classes, err := s.q.ListOptionBlockClasses(ctx, ids)
	if err != nil {
		return nil, err
	}
	for _, c := range classes {
		out[index[c.BlockID]].Classes = append(out[index[c.BlockID]].Classes, c.ClassID)
	}
	subjects, err := s.q.ListOptionBlockSubjects(ctx, ids)
	if err != nil {
		return nil, err
	}
	for _, sub := range subjects {
		out[index[sub.BlockID]].Subjects = append(out[index[sub.BlockID]].Subjects, sub.SubjectID)
	}
	return out, nil
}

func (s *Store) createOptionBlock(ctx context.Context, year uuid.UUID, b BlockDef) (uuid.UUID, error) {
	id, err := s.q.CreateOptionBlock(ctx, db.CreateOptionBlockParams{AcademicYearID: year, GradeID: b.GradeID, Name: b.Name, PeriodsPerWeek: b.Periods})
	if err != nil {
		return uuid.Nil, err
	}
	for _, sub := range b.Subjects {
		if err := s.q.AddOptionBlockSubject(ctx, db.AddOptionBlockSubjectParams{BlockID: id, SubjectID: sub}); err != nil {
			return uuid.Nil, err
		}
	}
	for _, c := range b.Classes {
		if err := s.q.AddOptionBlockClass(ctx, db.AddOptionBlockClassParams{BlockID: id, ClassID: c}); err != nil {
			return uuid.Nil, err
		}
	}
	return id, nil
}

func (s *Store) deleteOptionBlocks(ctx context.Context, ids []uuid.UUID) error {
	return s.q.DeleteOptionBlocks(ctx, ids)
}

func (s *Store) optionBlocksInSubmittedTimetables(ctx context.Context, ids []uuid.UUID) (bool, error) {
	return s.q.OptionBlocksInSubmittedTimetables(ctx, ids)
}

func (s *Store) generateSection(ctx context.Context, year, section, actor uuid.UUID) (timetablemodule.GenerationResult, error) {
	return timetablemodule.GenerateWith(ctx, s.q, timetablemodule.GenerationRequest{GradeSectionID: section, AcademicYearID: year}, actor)
}

func (s *Store) deleteDraftTimetables(ctx context.Context, ids []uuid.UUID) error {
	return s.q.WfDeleteDraftTimetables(ctx, ids)
}

func (s *Store) timetablesPastDraft(ctx context.Context, ids []uuid.UUID) (bool, error) {
	return s.q.WfTimetablesPastDraft(ctx, ids)
}
