package repositories

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type DashboardRepository struct {
	queries *db.Queries
}

func NewDashboardRepository(pool *pgxpool.Pool) *DashboardRepository {
	return &DashboardRepository{queries: db.New(pool)}
}

func (r *DashboardRepository) StudentCountByGrade(ctx context.Context) ([]db.DashboardStudentCountByGradeRow, error) {
	return r.queries.DashboardStudentCountByGrade(ctx)
}

func (r *DashboardRepository) StudentCountByClass(ctx context.Context) ([]db.DashboardStudentCountByClassRow, error) {
	return r.queries.DashboardStudentCountByClass(ctx)
}

func (r *DashboardRepository) StudentGenderDistribution(ctx context.Context) ([]db.DashboardStudentGenderDistributionRow, error) {
	return r.queries.DashboardStudentGenderDistribution(ctx)
}

func (r *DashboardRepository) StudentHouseDistribution(ctx context.Context) ([]db.DashboardStudentHouseDistributionRow, error) {
	return r.queries.DashboardStudentHouseDistribution(ctx)
}

func (r *DashboardRepository) StudentAttendanceTrend(ctx context.Context) ([]db.DashboardStudentAttendanceTrendRow, error) {
	return r.queries.DashboardStudentAttendanceTrend(ctx)
}

func (r *DashboardRepository) StaffCounts(ctx context.Context) (db.DashboardStaffCountsRow, error) {
	return r.queries.DashboardStaffCounts(ctx)
}

func (r *DashboardRepository) StaffAttendanceThisMonth(ctx context.Context) (db.DashboardStaffAttendanceThisMonthRow, error) {
	return r.queries.DashboardStaffAttendanceThisMonth(ctx)
}

func (r *DashboardRepository) SubjectPerformance(ctx context.Context) ([]db.DashboardSubjectPerformanceRow, error) {
	return r.queries.DashboardSubjectPerformance(ctx)
}

func (r *DashboardRepository) ExaminationSummary(ctx context.Context) (db.DashboardExaminationSummaryRow, error) {
	return r.queries.DashboardExaminationSummary(ctx)
}

func (r *DashboardRepository) GradeWisePerformance(ctx context.Context) ([]db.DashboardGradeWisePerformanceRow, error) {
	return r.queries.DashboardGradeWisePerformance(ctx)
}

func (r *DashboardRepository) ClassWisePerformance(ctx context.Context) ([]db.DashboardClassWisePerformanceRow, error) {
	return r.queries.DashboardClassWisePerformance(ctx)
}

func (r *DashboardRepository) AttendancePercentage(ctx context.Context) (db.DashboardAttendancePercentageRow, error) {
	return r.queries.DashboardAttendancePercentage(ctx)
}

func (r *DashboardRepository) StudentGrowth(ctx context.Context) ([]db.DashboardStudentGrowthRow, error) {
	return r.queries.DashboardStudentGrowth(ctx)
}

func (r *DashboardRepository) StaffGrowth(ctx context.Context) ([]db.DashboardStaffGrowthRow, error) {
	return r.queries.DashboardStaffGrowth(ctx)
}

func (r *DashboardRepository) NotificationsSentCount(ctx context.Context) (int64, error) {
	return r.queries.DashboardNotificationsSentCount(ctx)
}

func (r *DashboardRepository) TimetableCompletion(ctx context.Context) (db.DashboardTimetableCompletionRow, error) {
	return r.queries.DashboardTimetableCompletion(ctx)
}
