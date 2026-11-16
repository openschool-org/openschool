// Package leave owns teacher leave: applications with relief arrangements,
// Principal / Vice Principal approval, and the leave register and balances.
//
// The rules follow the Sri Lankan public service leave scheme as it applies
// to government school teachers (Establishments Code, Chapter XII, and the
// maternity leave circulars). See docs/adr/0010-teacher-leave-rules.md for
// what is enforced here and what is left to the Principal's judgement.
package leave

import (
	"errors"
	"fmt"
	"time"
)

// Leave types, matching the CHECK constraint on teacher_leave_requests.
const (
	TypeCasual    = "casual"
	TypeSick      = "sick"
	TypeDuty      = "duty"
	TypeMaternity = "maternity"
	TypeNoPay     = "no_pay"
	TypeShort     = "short"
)

// Day parts. A half day is the morning (before the interval) or the
// afternoon (after it) of a single day.
const (
	DayFull      = "full"
	DayMorning   = "morning"
	DayAfternoon = "afternoon"
)

// Statuses, matching the CHECK constraint on teacher_leave_requests.
const (
	StatusPending   = "pending"
	StatusApproved  = "approved"
	StatusRejected  = "rejected"
	StatusCancelled = "cancelled"
)

// Policy holds the leave limits an administrator sets in Settings.
// Casual and sick days are per calendar year and do not carry forward.
// Maternity is the full-pay period for one confinement; the rest is no-pay leave.
type Policy struct {
	CasualDaysPerYear    int `json:"casual_days_per_year"`
	SickDaysPerYear      int `json:"sick_days_per_year"`
	ShortLeavesPerMonth  int `json:"short_leaves_per_month"`
	ShortLeaveMaxMinutes int `json:"short_leave_max_minutes"`
	MaternityDays        int `json:"maternity_days"`
}

// DefaultPolicy is the public service scheme from ADR 0010, used until an admin changes it.
func DefaultPolicy() Policy {
	return Policy{CasualDaysPerYear: 21, SickDaysPerYear: 20, ShortLeavesPerMonth: 2, ShortLeaveMaxMinutes: 90, MaternityDays: 84}
}

// Validate keeps each limit inside the database CHECK ranges.
func (p Policy) Validate() error {
	switch {
	case p.CasualDaysPerYear < 0 || p.CasualDaysPerYear > 366:
		return errors.New("casual leave must be between 0 and 366 days")
	case p.SickDaysPerYear < 0 || p.SickDaysPerYear > 366:
		return errors.New("medical leave must be between 0 and 366 days")
	case p.ShortLeavesPerMonth < 0 || p.ShortLeavesPerMonth > 31:
		return errors.New("short leaves per month must be between 0 and 31")
	case p.ShortLeaveMaxMinutes < 15 || p.ShortLeaveMaxMinutes > 480:
		return errors.New("short leave length must be between 15 and 480 minutes")
	case p.MaternityDays < 1 || p.MaternityDays > 366:
		return errors.New("maternity leave must be between 1 and 366 days")
	}
	return nil
}

// annualEntitlement is the yearly allowance for the types that have one.
func (p Policy) annualEntitlement(leaveType string) (float64, bool) {
	switch leaveType {
	case TypeCasual:
		return float64(p.CasualDaysPerYear), true
	case TypeSick:
		return float64(p.SickDaysPerYear), true
	}
	return 0, false
}

const (
	// MaxReliefDays caps how many working days of periods are listed for
	// relief. Longer leave is covered by an acting teacher instead.
	MaxReliefDays = 10
	// maxCandidateSlots caps one relief-candidates batch request.
	maxCandidateSlots = 120
)

var (
	ErrInvalidType        = errors.New("unknown leave type")
	ErrInvalidDates       = errors.New("end date must not be before start date")
	ErrCrossesYear        = errors.New("leave cannot run into the next calendar year; apply for each year separately")
	ErrNoWorkingDays      = errors.New("the selected dates contain no working days")
	ErrHalfDayNotAllowed  = errors.New("only casual and duty leave can be taken as a half day, on a single date")
	ErrShortLeaveShape    = errors.New("short leave is for part of one day: give the date with a start and end time")
	ErrShortLeaveTooLong  = errors.New("short leave is too long")
	ErrShortLeaveUsedUp   = errors.New("no short leave left this month")
	ErrOverlap            = errors.New("you already have leave applied for some of these dates")
	ErrBalanceExceeded    = errors.New("not enough leave left for this year")
	ErrMaternityTooLong   = errors.New("maternity leave is longer than the full-pay period")
	ErrActingIsSelf       = errors.New("the acting teacher must be someone else")
	ErrReliefIsSelf       = errors.New("a relief teacher must be someone else")
	ErrReliefOutsideLeave = errors.New("a relief period falls outside the leave dates")
)

var validTypes = map[string]bool{
	TypeCasual: true, TypeSick: true, TypeDuty: true, TypeMaternity: true, TypeNoPay: true, TypeShort: true,
}

// halfDayTypes may be taken as a morning or afternoon.
var halfDayTypes = map[string]bool{TypeCasual: true, TypeDuty: true}

// WorkingDays counts Monday to Friday between from and to, inclusive.
// Public and school holidays are not known to the system, so a leave that
// spans one is charged for it; the approver corrects the dates if needed.
func WorkingDays(from, to time.Time) int {
	count := 0
	for d := from; !d.After(to); d = d.AddDate(0, 0, 1) {
		if isWorkingDay(d) {
			count++
		}
	}
	return count
}

func isWorkingDay(d time.Time) bool {
	return d.Weekday() != time.Saturday && d.Weekday() != time.Sunday
}

// schoolDayOfWeek maps a date to the timetable's 1 (Monday) to 5 (Friday), or 0 at a weekend.
func schoolDayOfWeek(d time.Time) int16 {
	if !isWorkingDay(d) {
		return 0
	}
	return int16(d.Weekday())
}

// chargedDays checks the shape of an application and returns the working
// days it charges: 0.5 for a half day and 0 for short leave, which is
// limited per month instead.
func chargedDays(a Application, p Policy) (float64, error) {
	if !validTypes[a.LeaveType] {
		return 0, ErrInvalidType
	}
	if a.End.Before(a.Start) {
		return 0, ErrInvalidDates
	}
	if a.Start.Year() != a.End.Year() {
		return 0, ErrCrossesYear
	}
	if a.LeaveType == TypeShort {
		from, fromErr := clockMinutes(a.StartTime)
		to, toErr := clockMinutes(a.EndTime)
		if !a.Start.Equal(a.End) || a.DayPart != DayFull || fromErr != nil || toErr != nil || from >= to {
			return 0, ErrShortLeaveShape
		}
		if to-from > p.ShortLeaveMaxMinutes {
			return 0, fmt.Errorf("%w: the limit is %d minutes", ErrShortLeaveTooLong, p.ShortLeaveMaxMinutes)
		}
		if !isWorkingDay(a.Start) {
			return 0, ErrNoWorkingDays
		}
		return 0, nil
	}
	if a.StartTime != "" || a.EndTime != "" {
		return 0, ErrShortLeaveShape
	}
	if a.DayPart != DayFull {
		if !halfDayTypes[a.LeaveType] || !a.Start.Equal(a.End) || (a.DayPart != DayMorning && a.DayPart != DayAfternoon) {
			return 0, ErrHalfDayNotAllowed
		}
		if !isWorkingDay(a.Start) {
			return 0, ErrNoWorkingDays
		}
		return 0.5, nil
	}
	days := WorkingDays(a.Start, a.End)
	if days == 0 {
		return 0, ErrNoWorkingDays
	}
	if a.LeaveType == TypeMaternity && days > p.MaternityDays {
		return 0, fmt.Errorf("%w: full pay covers %d working days; apply for the rest as no-pay leave", ErrMaternityTooLong, p.MaternityDays)
	}
	return float64(days), nil
}

// checkEntitlement rejects an application that would take a type with a
// yearly allowance past it, counting leave still waiting for approval so a
// teacher cannot queue more than they have.
func checkEntitlement(leaveType string, days float64, usage map[string]Usage, p Policy) error {
	limit, ok := p.annualEntitlement(leaveType)
	if !ok {
		return nil
	}
	used := usage[leaveType]
	if used.Approved+used.Pending+days > limit {
		return fmt.Errorf("%w: %s leave has %.1f of %d days left", ErrBalanceExceeded, typeLabel(leaveType), limit-used.Approved-used.Pending, int(limit))
	}
	return nil
}

func typeLabel(leaveType string) string {
	switch leaveType {
	case TypeCasual:
		return "casual"
	case TypeSick:
		return "medical"
	case TypeDuty:
		return "duty"
	case TypeMaternity:
		return "maternity"
	case TypeNoPay:
		return "no-pay"
	case TypeShort:
		return "short"
	}
	return leaveType
}

// coversPeriod reports whether a timetable period falls inside the part of
// the day the application takes. Periods with no clock time (a grade with
// no period grid) are always included rather than silently dropped.
func coversPeriod(a Application, p periodSlot) bool {
	if p.StartTime == "" || p.EndTime == "" {
		return true
	}
	switch {
	case a.LeaveType == TypeShort:
		// zero-padded HH:MM strings order the same way as the times
		return p.StartTime < a.EndTime && p.EndTime > a.StartTime
	case a.DayPart == DayMorning:
		return !p.AfterInterval
	case a.DayPart == DayAfternoon:
		return p.AfterInterval
	}
	return true
}

// clockMinutes parses an HH:MM time of day into minutes after midnight.
func clockMinutes(value string) (int, error) {
	t, err := time.Parse("15:04", value)
	if err != nil {
		return 0, fmt.Errorf("invalid time %q (expected HH:MM)", value)
	}
	return t.Hour()*60 + t.Minute(), nil
}

// normalizeClock zero-pads a valid time of day ("7:30" to "07:30") and
// leaves anything else as given for validation to reject.
func normalizeClock(value string) string {
	minutes, err := clockMinutes(value)
	if err != nil {
		return value
	}
	return fmt.Sprintf("%02d:%02d", minutes/60, minutes%60)
}
