package services

import (
	"context"
	"strconv"

	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/repositories"
)

type DashboardService struct {
	repo *repositories.DashboardRepository
}

func NewDashboardService(repo *repositories.DashboardRepository) *DashboardService {
	return &DashboardService{repo: repo}
}

// Analytics composes every Phase 7 aggregate into one response. Each
// section is independent, so a failure in one query doesn't need to fail
// the whole page — but to keep this a straightforward first pass, any
// query error fails the whole request; the dashboard already tolerates a
// full-page error state.
func (s *DashboardService) Analytics(ctx context.Context) (models.DashboardAnalyticsResponse, error) {
	var resp models.DashboardAnalyticsResponse

	byGrade, err := s.repo.StudentCountByGrade(ctx)
	if err != nil {
		return resp, err
	}
	var total int64
	for _, g := range byGrade {
		resp.Student.ByGrade = append(resp.Student.ByGrade, models.CountRow{Label: g.GradeName, Count: g.StudentCount})
		total += g.StudentCount
	}
	resp.Student.Total = total

	byClass, err := s.repo.StudentCountByClass(ctx)
	if err != nil {
		return resp, err
	}
	for _, c := range byClass {
		resp.Student.ByClass = append(resp.Student.ByClass, models.CountRow{Label: c.GradeName + " " + c.ClassName, Count: c.StudentCount})
	}

	gender, err := s.repo.StudentGenderDistribution(ctx)
	if err != nil {
		return resp, err
	}
	for _, g := range gender {
		resp.Student.GenderDistribution = append(resp.Student.GenderDistribution, models.CountRow{Label: g.Gender, Count: g.StudentCount})
	}

	houses, err := s.repo.StudentHouseDistribution(ctx)
	if err != nil {
		return resp, err
	}
	for _, h := range houses {
		resp.Student.HouseDistribution = append(resp.Student.HouseDistribution, models.HouseCountRow{Name: h.HouseName, Color: h.HouseColor, Count: h.StudentCount})
	}

	trend, err := s.repo.StudentAttendanceTrend(ctx)
	if err != nil {
		return resp, err
	}
	for _, t := range trend {
		resp.Student.AttendanceTrend = append(resp.Student.AttendanceTrend, models.AttendanceTrendPoint{
			Date:         t.Date.Time.Format("2006-01-02"),
			PresentCount: t.PresentCount,
			TotalCount:   t.TotalCount,
		})
	}

	staffCounts, err := s.repo.StaffCounts(ctx)
	if err != nil {
		return resp, err
	}
	resp.Staff.AcademicStaffCount = staffCounts.AcademicStaffCount
	resp.Staff.NonAcademicStaffCount = staffCounts.NonAcademicStaffCount

	staffAttendance, err := s.repo.StaffAttendanceThisMonth(ctx)
	if err != nil {
		return resp, err
	}
	resp.Staff.AttendanceThisMonth = models.StaffAttendanceTotals{
		PresentCount: staffAttendance.PresentCount,
		LateCount:    staffAttendance.LateCount,
		AbsentCount:  staffAttendance.AbsentCount,
		LeaveCount:   staffAttendance.LeaveCount,
	}

	subjectPerf, err := s.repo.SubjectPerformance(ctx)
	if err != nil {
		return resp, err
	}
	for _, p := range subjectPerf {
		resp.Academic.SubjectPerformance = append(resp.Academic.SubjectPerformance, models.PerformanceRow{
			Label:             p.SubjectName,
			AveragePercentage: numericToFloat64(p.AveragePercentage),
			Entries:           p.Entries,
		})
	}

	examSummary, err := s.repo.ExaminationSummary(ctx)
	if err != nil {
		return resp, err
	}
	resp.Academic.ExaminationAverage = numericToFloat64(examSummary.AveragePercentage)
	resp.Academic.ExaminationEntries = examSummary.Entries
	resp.Academic.StudentsWithMarks = examSummary.StudentsWithMarks

	gradePerf, err := s.repo.GradeWisePerformance(ctx)
	if err != nil {
		return resp, err
	}
	for _, p := range gradePerf {
		resp.Academic.GradeWisePerformance = append(resp.Academic.GradeWisePerformance, models.PerformanceRow{
			Label:             p.GradeName,
			AveragePercentage: numericToFloat64(p.AveragePercentage),
		})
	}

	attendancePct, err := s.repo.AttendancePercentage(ctx)
	if err != nil {
		return resp, err
	}
	if attendancePct.TotalCount > 0 {
		resp.Academic.AttendancePercentage = float64(attendancePct.PresentCount) / float64(attendancePct.TotalCount) * 100
	}

	studentGrowth, err := s.repo.StudentGrowth(ctx)
	if err != nil {
		return resp, err
	}
	for _, g := range studentGrowth {
		resp.School.StudentGrowth = append(resp.School.StudentGrowth, models.GrowthPoint{Label: g.AcademicYearLabel, Count: g.StudentCount})
	}

	staffGrowth, err := s.repo.StaffGrowth(ctx)
	if err != nil {
		return resp, err
	}
	for _, g := range staffGrowth {
		resp.School.StaffGrowth = append(resp.School.StaffGrowth, models.GrowthPoint{Label: strconv.Itoa(int(g.Year)), Count: g.TeacherCount})
	}

	notifCount, err := s.repo.NotificationsSentCount(ctx)
	if err != nil {
		return resp, err
	}
	resp.School.NotificationsSentCount = notifCount

	timetable, err := s.repo.TimetableCompletion(ctx)
	if err != nil {
		return resp, err
	}
	resp.School.TotalClasses = timetable.TotalClasses
	resp.School.PublishedClasses = timetable.PublishedClasses
	if timetable.TotalClasses > 0 {
		resp.School.TimetableCompletionPct = float64(timetable.PublishedClasses) / float64(timetable.TotalClasses) * 100
	}

	return resp, nil
}
