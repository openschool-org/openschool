package selfservice

import (
	"testing"

	"github.com/gin-gonic/gin"
)

func TestRegisterRoutesPreservesPortalEndpoints(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	group := router.Group("")
	studentProfiles := NewStudentProfiles(studentProfileStoreStub{})
	teacherProfiles := NewTeacherProfiles(teacherProfileStoreStub{})

	RegisterRoutes(group, group, group, nil, studentProfiles, teacherProfiles, nil, nil, nil, nil, nil)

	want := map[string]bool{
		"GET /me/student":                      true,
		"GET /me/student/attendance":           true,
		"GET /me/student/marks":                true,
		"GET /me/student/enrollments":          true,
		"POST /me/student/enrollments":         true,
		"POST /me/student/enrollments/confirm": true,
		"GET /me/children":                     true,
		"GET /me/children/summary":             true,
		"GET /me/children/:id/attendance":      true,
		"GET /me/children/:id/marks":           true,
		"GET /me/children/:id/timetable":       true,
		"GET /me/teacher":                      true,
		"GET /me/teacher/position":             true,
		"GET /me/teacher/leadership-overview":  true,
		"GET /me/teacher/society":              true,
		"GET /me/teacher/analytics":            true,
		"GET /me/teacher/timetables":           true,
	}

	for _, route := range router.Routes() {
		delete(want, route.Method+" "+route.Path)
	}
	if len(want) != 0 {
		t.Fatalf("missing self-service routes: %v", want)
	}
}
