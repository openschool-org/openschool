package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

func RegisterNonAcademicStaffRoutes(admin *gin.RouterGroup, teacherOrAdmin *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewNonAcademicStaffRepository(pool)
	auditSvc := services.NewAuditService(repositories.NewAuditRepository(pool))
	service := services.NewNonAcademicStaffService(repo, auditSvc)
	handler := handlers.NewNonAcademicStaffHandler(service)

	admin.POST("/non-academic-staff", handler.Create)
	teacherOrAdmin.GET("/non-academic-staff", handler.List)
	teacherOrAdmin.GET("/non-academic-staff/:id", handler.GetByID)
	admin.PUT("/non-academic-staff/:id", handler.Update)
	admin.PUT("/non-academic-staff/:id/employment-status", handler.UpdateEmploymentStatus)
	admin.PUT("/non-academic-staff/:id/house", handler.UpdateHouse)
	admin.DELETE("/non-academic-staff/:id", handler.Delete)
}
