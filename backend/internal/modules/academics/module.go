// Package academics owns curriculum, class structure, enrollment, marks, and promotion use cases.
package academics

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// RegisterSubjectRoutes mounts the subject vertical slice.
func RegisterSubjectRoutes(admin, teacherOrAdmin *gin.RouterGroup, pool *pgxpool.Pool) {
	handler := newSubjectHandler(newSubjectRepository(pool))
	admin.POST("/subjects", handler.create)
	// Subjects are mutable catalogue data and can be created by the curriculum
	// preset. Do not let an old browser/ETag response hide newly saved subjects.
	teacherOrAdmin.GET("/subjects", handler.list)
	teacherOrAdmin.GET("/subjects/:id", handler.get)
	admin.PUT("/subjects/:id", handler.update)
	admin.DELETE("/subjects/:id", handler.delete)
}

// RegisterStreamRoutes mounts A/L streams and their subgroup endpoints.
func RegisterStreamRoutes(admin, teacherOrAdmin *gin.RouterGroup, pool *pgxpool.Pool) {
	handler := newStreamHandler(newStreamRepository(pool))
	admin.POST("/streams", handler.create)
	teacherOrAdmin.GET("/streams", handler.list)
	teacherOrAdmin.GET("/streams/:id", handler.get)
	admin.PUT("/streams/:id", handler.update)
	admin.DELETE("/streams/:id", handler.delete)
	admin.POST("/streams/:id/groups", handler.createGroup)
	teacherOrAdmin.GET("/streams/:id/groups", handler.listGroups)
	teacherOrAdmin.GET("/streams/:id/groups/:groupId", handler.getGroup)
	admin.PUT("/streams/:id/groups/:groupId", handler.updateGroup)
	admin.DELETE("/streams/:id/groups/:groupId", handler.deleteGroup)
}
