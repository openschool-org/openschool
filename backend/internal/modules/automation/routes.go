package automation

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// RegisterRoutes exposes the admin Automation panel and returns the scheduler
// whose Start/Stop lifecycle is owned by cmd/api.
func RegisterRoutes(admin *gin.RouterGroup, pool *pgxpool.Pool) *Scheduler {
	settingsRepo := NewRepository(pool)
	scheduler := NewScheduler(BuildAll(pool), settingsRepo)
	handler := NewJobsHandler(NewService(scheduler, settingsRepo))

	admin.GET("/jobs", handler.List)
	admin.GET("/jobs/findings", handler.Findings)
	admin.PUT("/jobs/:name/enabled", handler.SetEnabled)
	admin.POST("/jobs/:name/run", handler.RunNow)

	return scheduler
}
