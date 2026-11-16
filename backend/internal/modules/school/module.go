package school

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/middleware"
)

// referenceDataMaxAgeSeconds is how long a client may cache rarely-changing
// reference data (grades, houses) before revalidating (section 5).
const referenceDataMaxAgeSeconds = 300

// RegisterHouseRoutes mounts house management using the shared assignment service.
func RegisterHouseRoutes(admin, teacherOrAdmin *gin.RouterGroup, service *HouseService) {
	handler := &houseHandler{service: service}
	admin.POST("/houses", handler.create)
	teacherOrAdmin.GET("/houses", middleware.CacheReference(referenceDataMaxAgeSeconds), handler.list)
	teacherOrAdmin.GET("/houses/:id", handler.get)
	admin.PUT("/houses/:id", handler.update)
	admin.DELETE("/houses/:id", handler.delete)
	admin.POST("/houses/reassign-missing", handler.reassignMissing)
	admin.POST("/houses/reassign-missing-staff", handler.reassignMissingStaff)
}

// RegisterGradeRoutes mounts the grade vertical slice.
func RegisterGradeRoutes(admin, teacherOrAdmin *gin.RouterGroup, pool *pgxpool.Pool) {
	handler := newGradeHandler(newGradeRepository(pool))
	admin.POST("/grades", handler.create)
	teacherOrAdmin.GET("/grades", middleware.CacheReference(referenceDataMaxAgeSeconds), handler.list)
	teacherOrAdmin.GET("/grades/:id", handler.get)
	admin.PUT("/grades/:id", handler.update)
	admin.DELETE("/grades/:id", handler.delete)
}

func RegisterTermRoutes(admin, authenticated *gin.RouterGroup, pool *pgxpool.Pool) {
	handler := newTermHandler(newTermRepository(pool))
	admin.POST("/terms", handler.create)
	authenticated.GET("/terms", handler.list)
	authenticated.GET("/terms/current", handler.current)
	admin.PUT("/terms/:id/set-current", handler.setCurrent)
	admin.PUT("/terms/:id", handler.update)
	admin.DELETE("/terms/:id", handler.delete)
}

func RegisterSchoolRoutes(admin, teacherOrAdmin, authenticated *gin.RouterGroup, pool *pgxpool.Pool) {
	handler := newSchoolHandler(newSchoolRepository(pool))
	admin.POST("/school", handler.createSchool)
	teacherOrAdmin.GET("/school", handler.getSchool)
	authenticated.GET("/school/branding", handler.getBranding)
	admin.PUT("/school/:id", handler.updateSchool)
	admin.POST("/academic-years", handler.createYear)
	teacherOrAdmin.GET("/academic-years", handler.listYears)
	authenticated.GET("/academic-years/current", handler.currentYear)
	admin.PUT("/academic-years/:id/set-current", handler.setCurrentYear)
	admin.DELETE("/academic-years/:id", handler.deleteYear)
}
