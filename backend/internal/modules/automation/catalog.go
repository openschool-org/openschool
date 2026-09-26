package automation

// CheckInfo describes one check an agent runs. FindingTitle is the exact notice title the
// check sends when it finds something; Pages are the admin routes (prefix match) where that
// finding appears as a banner. The frontend reads these instead of listing titles itself.
type CheckInfo struct {
	Key          string   `json:"key"`
	Title        string   `json:"title"`
	Description  string   `json:"description"`
	FindingTitle string   `json:"finding_title,omitempty"`
	Pages        []string `json:"pages,omitempty"`
}

// Describer is implemented by every registered agent so the Automation panel is fully backend-driven.
type Describer interface {
	Title() string
	CanDisable() bool
	Checks() []CheckInfo
}

// scheduleLabels names every cron expression the agents use; an unknown one falls back to the raw expression.
var scheduleLabels = map[string]string{
	"0 * * * *":    "Hourly",
	"0 2 * * *":    "Daily at 2:00 AM",
	"0 3 * * *":    "Daily at 3:00 AM",
	"0 5 * * *":    "Daily at 5:00 AM",
	"0 12 * * 1-5": "Weekdays at 12:00 PM",
}

func scheduleLabel(cron string) string {
	if label, ok := scheduleLabels[cron]; ok {
		return label
	}
	return cron
}
