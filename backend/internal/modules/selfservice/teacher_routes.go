package selfservice

import (
	"github.com/gin-gonic/gin"
)

// registerTeacherRoutes wires the signed-in teacher's self-service endpoints
// through narrow read contracts owned by the participating modules.
func registerTeacherRoutes(teacher *gin.RouterGroup, profiles *TeacherProfiles, timetableService TimetableReader, positionService LeadershipReader, societyService SocietyReader, dashboardService DashboardReader) {
	handler := NewTeacherSelfHandler(profiles, positionService, societyService, dashboardService, timetableService)

	teacher.GET("/me/teacher", handler.Profile)
	teacher.GET("/me/teacher/position", handler.Position)
	teacher.GET("/me/teacher/leadership-overview", handler.LeadershipOverview)
	teacher.GET("/me/teacher/led-classes", handler.LedClasses)
	teacher.GET("/me/teacher/society", handler.Society)
	teacher.GET("/me/teacher/analytics", handler.Analytics)
	teacher.GET("/me/teacher/timetables", handler.Timetables)
}
