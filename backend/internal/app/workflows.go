package app

import (
	"github.com/jackc/pgx/v5/pgxpool"
	workflowsmodule "github.com/openschool-org/openschool/internal/modules/workflows"
)

// registerWorkflows wires the year-end workflows in pipeline order.
func registerWorkflows(groups HTTPGroups, pool *pgxpool.Pool, shared sharedServices) {
	store := workflowsmodule.NewStore(pool)
	engine := workflowsmodule.NewEngine(store, shared.audit, []workflowsmodule.Definition{
		workflowsmodule.YearRollover{},
		workflowsmodule.Leavers{},
		workflowsmodule.Promotion{},
		workflowsmodule.NewGoLive(shared.notifications),
	})
	workflowsmodule.RegisterRoutes(groups.Admin, engine)
}
