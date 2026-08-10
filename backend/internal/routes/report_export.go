package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

func RegisterReportExportRoutes(admin *gin.RouterGroup, pool *pgxpool.Pool) {
	service := services.NewReportExportService(
		repositories.NewAttendanceRepository(pool),
		repositories.NewTermMarkRepository(pool),
		repositories.NewClassRepository(pool),
		repositories.NewTermRepository(pool),
		repositories.NewSubjectRepository(pool),
	)
	handler := handlers.NewReportExportHandler(service)

	admin.GET("/reports/attendance", handler.ExportAttendance)
	admin.GET("/reports/marks", handler.ExportMarks)
}
