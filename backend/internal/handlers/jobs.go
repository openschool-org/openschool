package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/jobs"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/repositories"
)

type JobsHandler struct {
	scheduler *jobs.Scheduler
	settings  *repositories.JobSchedulerRepository
}

func NewJobsHandler(scheduler *jobs.Scheduler, settings *repositories.JobSchedulerRepository) *JobsHandler {
	return &JobsHandler{scheduler: scheduler, settings: settings}
}

func (h *JobsHandler) knownJobNames() map[string]bool {
	names := make(map[string]bool, len(h.scheduler.Jobs()))
	for _, j := range h.scheduler.Jobs() {
		names[j.Name()] = true
	}
	return names
}

func toLastRun(r db.JobRun) *models.JobLastRun {
	lastRun := &models.JobLastRun{
		Status:    r.Status,
		Findings:  r.Findings,
		StartedAt: r.StartedAt.Time,
	}
	if r.Summary.Valid {
		lastRun.Summary = r.Summary.String
	}
	if r.FinishedAt.Valid {
		finishedAt := r.FinishedAt.Time
		lastRun.FinishedAt = &finishedAt
	}
	return lastRun
}

// List godoc
// @Summary      List every registered background job and its current state
// @Tags         jobs
// @Produce      json
// @Success      200 {array} models.JobStatus
// @Security     BearerAuth
// @Router       /jobs [get]
func (h *JobsHandler) List(c *gin.Context) {
	ctx := c.Request.Context()
	jobList := h.scheduler.Jobs()

	settingsRows, err := h.settings.ListSettings(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	enabledByName := make(map[string]bool, len(settingsRows))
	for _, s := range settingsRows {
		enabledByName[s.JobName] = s.Enabled
	}

	runRows, err := h.settings.ListLatestRuns(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	lastRunByName := make(map[string]db.JobRun, len(runRows))
	for _, r := range runRows {
		lastRunByName[r.JobName] = r
	}

	out := make([]models.JobStatus, 0, len(jobList))
	for _, j := range jobList {
		enabled, ok := enabledByName[j.Name()]
		if !ok {
			enabled = true // no row yet — see JobSchedulerRepository.IsEnabled
		}
		status := models.JobStatus{
			Name: j.Name(), Description: j.Description(), Schedule: j.Schedule(), Enabled: enabled,
		}
		if r, ok := lastRunByName[j.Name()]; ok {
			status.LastRun = toLastRun(r)
		}
		out = append(out, status)
	}

	c.JSON(http.StatusOK, out)
}

// SetEnabled godoc
// @Summary      Enable or disable a background job
// @Tags         jobs
// @Accept       json
// @Produce      json
// @Param        name path string true "Job name"
// @Param        request body models.SetJobEnabledRequest true "Enabled state"
// @Success      200 {object} map[string]string
// @Failure      404 {object} map[string]string
// @Security     BearerAuth
// @Router       /jobs/{name}/enabled [put]
func (h *JobsHandler) SetEnabled(c *gin.Context) {
	name := c.Param("name")
	if !h.knownJobNames()[name] {
		c.JSON(http.StatusNotFound, gin.H{"error": "unknown job"})
		return
	}

	var req models.SetJobEnabledRequest
	if err := bindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// The backup job is the one exception to "every job is safely
	// optional": disabling it silently stops the school's only backup
	// mechanism, with no other symptom until data loss during a real
	// incident. Blocked outright rather than just warned about, both here
	// and in the Automation UI (which never renders its toggle).
	if !req.Enabled && name == jobs.BackupJobName {
		c.JSON(http.StatusBadRequest, gin.H{"error": "the backup job cannot be disabled"})
		return
	}

	if _, err := h.settings.SetEnabled(c.Request.Context(), name, req.Enabled); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "updated"})
}

// RunNow godoc
// @Summary      Run a background job immediately, outside its schedule
// @Description  Still honors the job's enabled/disabled setting
// @Tags         jobs
// @Produce      json
// @Param        name path string true "Job name"
// @Success      200 {object} map[string]interface{}
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /jobs/{name}/run [post]
func (h *JobsHandler) RunNow(c *gin.Context) {
	name := c.Param("name")
	if !h.knownJobNames()[name] {
		c.JSON(http.StatusNotFound, gin.H{"error": "unknown job"})
		return
	}

	result, err := h.scheduler.RunNow(c.Request.Context(), name)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "summary": result.Summary, "findings": result.Findings})
		return
	}
	c.JSON(http.StatusOK, gin.H{"summary": result.Summary, "findings": result.Findings})
}
