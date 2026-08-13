package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

func RegisterSocietyRoutes(admin *gin.RouterGroup, teacherOrAdmin *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewSocietyRepository(pool)
	service := services.NewSocietyService(repo, repositories.NewTeacherRepository(pool))
	handler := handlers.NewSocietyHandler(service)

	admin.POST("/societies", handler.Create)
	admin.PUT("/societies/:id", handler.Update)
	admin.DELETE("/societies/:id", handler.Delete)

	teacherOrAdmin.GET("/societies", handler.List)
	teacherOrAdmin.GET("/societies/years", handler.ListYears)
	teacherOrAdmin.GET("/societies/:id/members", handler.ListMembers)
	teacherOrAdmin.PUT("/societies/:id/members", handler.AssignMember)
	teacherOrAdmin.DELETE("/societies/:id/members/:memberId", handler.RemoveMember)
	teacherOrAdmin.GET("/students/:id/society-memberships", handler.ListByStudent)
}
