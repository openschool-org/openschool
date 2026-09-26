package selfservice

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	academicsmodule "github.com/openschool-org/openschool/internal/modules/academics"
	attendancemodule "github.com/openschool-org/openschool/internal/modules/attendance"
	"github.com/openschool-org/openschool/internal/ports"
)

func registerParentRoutes(parent *gin.RouterGroup, guardians ports.GuardianAccess, timetables TimetableReader, pool *pgxpool.Pool) {
	attendanceReader := attendancemodule.NewReader(attendancemodule.NewRepository(pool))
	marks := academicsmodule.NewTermMarkService(academicsmodule.NewTermMarkRepository(pool))
	handler := NewParentHandler(guardians, attendanceReader, marks, timetables)

	parent.GET("/me/children", handler.ListChildren)
	parent.GET("/me/children/summary", handler.ChildrenSummary)
	parent.GET("/me/children/:id/attendance", handler.ChildAttendance)
	parent.GET("/me/children/:id/marks", handler.ChildMarks)
	parent.GET("/me/children/:id/timetable", handler.ChildTimetable)
}
