package workflows

import "errors"

var (
	errClassesInUse    = errors.New("attendance or marks are already recorded for these classes, so the placement can no longer be reverted")
	errStudentsInUse   = errors.New("some imported students already have an account, a class, subjects or records, so the import can no longer be reverted")
	errTimetablesInUse = errors.New("a timetable for these classes has been submitted or published, so the allocation can no longer be reverted")
	errChoicesInUse    = errors.New("marks are already recorded for these students next year, so their subject choices can no longer be reverted")

	// ErrInvalidProposal means a row ticked for apply breaks a rule; the message names the row.
	ErrInvalidProposal = errors.New("the proposal has rows that cannot be applied")
)
