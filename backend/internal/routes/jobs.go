package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/jobs"
	"github.com/openschool-org/openschool/internal/repositories"
)

func RegisterJobRoutes(admin *gin.RouterGroup, pool *pgxpool.Pool, scheduler *jobs.Scheduler) {
	settingsRepo := repositories.NewJobSchedulerRepository(pool)
	handler := handlers.NewJobsHandler(scheduler, settingsRepo)

	admin.GET("/jobs", handler.List)
	admin.PUT("/jobs/:name/enabled", handler.SetEnabled)
	admin.POST("/jobs/:name/run", handler.RunNow)
}
