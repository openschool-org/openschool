package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

func RegisterCurriculumRoutes(admin *gin.RouterGroup, protected *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewCurriculumRepository(pool)
	service := services.NewCurriculumService(repo)
	handler := handlers.NewCurriculumHandler(service)

	// configuring the curriculum is admin-only
	admin.POST("/mediums", handler.CreateMedium)
	admin.PUT("/mediums/:id", handler.UpdateMedium)
	admin.DELETE("/mediums/:id", handler.DeleteMedium)

	admin.POST("/levels", handler.CreateLevel)
	admin.POST("/levels/:id/duplicate", handler.DuplicateLevel)
	admin.PUT("/levels/:id", handler.UpdateLevel)
	admin.DELETE("/levels/:id", handler.DeleteLevel)

	admin.POST("/levels/:id/groups", handler.CreateSelectionGroup)
	admin.PUT("/groups/:group_id", handler.UpdateSelectionGroup)
	admin.DELETE("/groups/:group_id", handler.DeleteSelectionGroup)

	admin.POST("/groups/:group_id/subjects", handler.AddGroupSubject)
	admin.DELETE("/groups/:group_id/subjects/:subject_id", handler.RemoveGroupSubject)

	// reads are open to any authenticated user: students browse what is on
	// offer before picking
	protected.GET("/mediums", handler.ListMediums)
	protected.GET("/levels", handler.ListLevels)
	protected.GET("/levels/:id", handler.GetLevel)
	protected.GET("/levels/:id/tree", handler.GetCurriculumTree)
	protected.GET("/levels/:id/groups", handler.ListSelectionGroups)
	protected.GET("/groups/:group_id/subjects", handler.ListGroupSubjects)
}
