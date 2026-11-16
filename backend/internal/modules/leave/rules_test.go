package leave

import (
	"errors"
	"testing"
	"time"
)

func day(value string) time.Time {
	t, err := time.Parse(time.DateOnly, value)
	if err != nil {
		panic(err)
	}
	return t
}

func TestWorkingDaysSkipsWeekends(t *testing.T) {
	// Friday 2026-10-02 to Tuesday 2026-10-06: Fri, Mon, Tue
	if got := WorkingDays(day("2026-10-02"), day("2026-10-06")); got != 3 {
		t.Fatalf("WorkingDays() = %d, want 3", got)
	}
}

func TestChargedDays(t *testing.T) {
	cases := []struct {
		name string
		app  Application
		want float64
		err  error
	}{
		{"casual week", Application{LeaveType: TypeCasual, DayPart: DayFull, Start: day("2026-10-05"), End: day("2026-10-09")}, 5, nil},
		{"casual afternoon", Application{LeaveType: TypeCasual, DayPart: DayAfternoon, Start: day("2026-10-05"), End: day("2026-10-05")}, 0.5, nil},
		{"sick half day", Application{LeaveType: TypeSick, DayPart: DayMorning, Start: day("2026-10-05"), End: day("2026-10-05")}, 0, ErrHalfDayNotAllowed},
		{"half day over two dates", Application{LeaveType: TypeCasual, DayPart: DayMorning, Start: day("2026-10-05"), End: day("2026-10-06")}, 0, ErrHalfDayNotAllowed},
		{"weekend only", Application{LeaveType: TypeCasual, DayPart: DayFull, Start: day("2026-10-03"), End: day("2026-10-04")}, 0, ErrNoWorkingDays},
		{"backwards", Application{LeaveType: TypeCasual, DayPart: DayFull, Start: day("2026-10-06"), End: day("2026-10-05")}, 0, ErrInvalidDates},
		{"crosses year", Application{LeaveType: TypeNoPay, DayPart: DayFull, Start: day("2026-12-30"), End: day("2027-01-04")}, 0, ErrCrossesYear},
		{"short leave", Application{LeaveType: TypeShort, DayPart: DayFull, Start: day("2026-10-05"), End: day("2026-10-05"), StartTime: "12:00", EndTime: "13:30"}, 0, nil},
		{"short leave too long", Application{LeaveType: TypeShort, DayPart: DayFull, Start: day("2026-10-05"), End: day("2026-10-05"), StartTime: "12:00", EndTime: "13:31"}, 0, ErrShortLeaveTooLong},
		{"short leave without times", Application{LeaveType: TypeShort, DayPart: DayFull, Start: day("2026-10-05"), End: day("2026-10-05")}, 0, ErrShortLeaveShape},
		{"times on casual leave", Application{LeaveType: TypeCasual, DayPart: DayFull, Start: day("2026-10-05"), End: day("2026-10-05"), StartTime: "12:00", EndTime: "13:00"}, 0, ErrShortLeaveShape},
		{"unknown type", Application{LeaveType: "vacation", DayPart: DayFull, Start: day("2026-10-05"), End: day("2026-10-05")}, 0, ErrInvalidType},
		{"maternity over 84 days", Application{LeaveType: TypeMaternity, DayPart: DayFull, Start: day("2026-01-05"), End: day("2026-06-30")}, 0, ErrMaternityTooLong},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := chargedDays(tc.app, DefaultPolicy())
			if !errors.Is(err, tc.err) || got != tc.want {
				t.Fatalf("chargedDays() = %v, %v; want %v, %v", got, err, tc.want, tc.err)
			}
		})
	}
}

func TestCheckEntitlementCountsPendingLeave(t *testing.T) {
	usage := map[string]Usage{TypeCasual: {Approved: 15, Pending: 4}}
	if err := checkEntitlement(TypeCasual, 2, usage, DefaultPolicy()); err != nil {
		t.Fatalf("2 of the last 2 days: %v", err)
	}
	if err := checkEntitlement(TypeCasual, 2.5, usage, DefaultPolicy()); !errors.Is(err, ErrBalanceExceeded) {
		t.Fatalf("over the allowance: err = %v", err)
	}
	if err := checkEntitlement(TypeDuty, 100, usage, DefaultPolicy()); err != nil {
		t.Fatalf("duty leave has no yearly limit: %v", err)
	}
}

func TestCoversPeriod(t *testing.T) {
	morning := periodSlot{StartTime: "07:50", EndTime: "08:30"}
	afternoon := periodSlot{StartTime: "11:20", EndTime: "12:00", AfterInterval: true}
	untimed := periodSlot{}
	half := Application{LeaveType: TypeCasual, DayPart: DayAfternoon}
	if coversPeriod(half, morning) || !coversPeriod(half, afternoon) || !coversPeriod(half, untimed) {
		t.Fatal("afternoon leave should cover only periods after the interval, and untimed ones")
	}
	short := Application{LeaveType: TypeShort, StartTime: "11:30", EndTime: "13:00"}
	if coversPeriod(short, morning) || !coversPeriod(short, afternoon) {
		t.Fatal("short leave should cover only overlapping periods")
	}
}

func TestNormalizeClock(t *testing.T) {
	if got := normalizeClock("7:30"); got != "07:30" {
		t.Fatalf("normalizeClock(7:30) = %q", got)
	}
}

func TestPolicyLimitsApply(t *testing.T) {
	p := DefaultPolicy()
	p.CasualDaysPerYear = 5
	p.ShortLeaveMaxMinutes = 30
	usage := map[string]Usage{TypeCasual: {Approved: 4}}
	if err := checkEntitlement(TypeCasual, 2, usage, p); !errors.Is(err, ErrBalanceExceeded) {
		t.Fatalf("checkEntitlement() = %v, want ErrBalanceExceeded with a 5 day limit", err)
	}
	short := Application{LeaveType: TypeShort, DayPart: DayFull, Start: day("2026-10-05"), End: day("2026-10-05"), StartTime: "12:00", EndTime: "12:45"}
	if _, err := chargedDays(short, p); !errors.Is(err, ErrShortLeaveTooLong) {
		t.Fatalf("chargedDays() = %v, want ErrShortLeaveTooLong with a 30 minute limit", err)
	}
}

func TestPolicyValidate(t *testing.T) {
	if err := DefaultPolicy().Validate(); err != nil {
		t.Fatalf("default policy invalid: %v", err)
	}
	p := DefaultPolicy()
	p.ShortLeaveMaxMinutes = 5
	if err := p.Validate(); err == nil {
		t.Fatal("Validate() accepted a 5 minute short leave limit")
	}
}
