package app

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/mailer"
	activationmodule "github.com/openschool-org/openschool/internal/modules/activation"
	auditmodule "github.com/openschool-org/openschool/internal/modules/audit"
	authmodule "github.com/openschool-org/openschool/internal/modules/auth"
	dashboardmodule "github.com/openschool-org/openschool/internal/modules/dashboard"
	identitymodule "github.com/openschool-org/openschool/internal/modules/identity"
	leadershipmodule "github.com/openschool-org/openschool/internal/modules/leadership"
	notificationmodule "github.com/openschool-org/openschool/internal/modules/notifications"
	peoplemodule "github.com/openschool-org/openschool/internal/modules/people"
	searchmodule "github.com/openschool-org/openschool/internal/modules/search"
	setupmodule "github.com/openschool-org/openschool/internal/modules/setup"
	studentleadershipmodule "github.com/openschool-org/openschool/internal/modules/studentleadership"
	"github.com/openschool-org/openschool/internal/thunderid"
)

type sharedServices struct {
	audit             *auditmodule.Service
	notifications     *notificationmodule.NotificationService
	leadership        *leadershipmodule.Service
	studentLeadership *studentleadershipmodule.Service
	dashboard         *dashboardmodule.Service
}

func registerCore(groups HTTPGroups, pool *pgxpool.Pool) sharedServices {
	groups.API.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	auditService := auditmodule.NewService(auditmodule.NewRepository(pool))
	notifications := notificationmodule.NewNotificationService(notificationmodule.NewNotificationRepository(pool))
	leadershipService := leadershipmodule.NewService(leadershipmodule.NewRepository(pool), auditService)
	studentLeadershipService := studentleadershipmodule.NewService(studentleadershipmodule.NewRepository(pool))
	dashboardService := dashboardmodule.NewService(dashboardmodule.NewRepository(pool))

	setupmodule.RegisterRoutes(groups.API, setupmodule.NewService(setupmodule.NewRepository(pool), thunderid.NewClient()))
	authmodule.RegisterRoutes(groups.API, groups.Protected, pool, peoplemodule.NewGuardianAuthenticator(pool), thunderid.NewClient())
	activationmodule.RegisterRoutes(groups.API, groups.Admin, activationmodule.NewService(
		activationmodule.NewRepository(pool), thunderid.NewClient(), mailer.NewFromEnv(), auditService))
	identitymodule.Register(groups.Protected, pool)
	identitymodule.RegisterReconciliation(groups.Admin, pool, thunderid.NewClient(), auditService)
	auditmodule.RegisterRoutes(groups.Admin, auditService)
	leadershipmodule.RegisterRoutes(groups.Admin, groups.TeacherOrAdmin, leadershipService)
	studentleadershipmodule.RegisterRoutes(groups.Admin, groups.TeacherOrAdmin, groups.StudentAccess, studentLeadershipService)
	dashboardmodule.RegisterRoutes(groups.Admin, dashboardService)
	searchmodule.RegisterRoutes(groups.Admin, searchmodule.NewService(searchmodule.NewRepository(pool)))

	return sharedServices{
		audit: auditService, notifications: notifications, leadership: leadershipService,
		studentLeadership: studentLeadershipService, dashboard: dashboardService,
	}
}
