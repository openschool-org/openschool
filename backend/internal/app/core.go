package app

import (
	"log"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/emails"
	"github.com/openschool-org/openschool/internal/mailer"
	activationmodule "github.com/openschool-org/openschool/internal/modules/activation"
	auditmodule "github.com/openschool-org/openschool/internal/modules/audit"
	authmodule "github.com/openschool-org/openschool/internal/modules/auth"
	dashboardmodule "github.com/openschool-org/openschool/internal/modules/dashboard"
	identitymodule "github.com/openschool-org/openschool/internal/modules/identity"
	leadershipmodule "github.com/openschool-org/openschool/internal/modules/leadership"
	mailmodule "github.com/openschool-org/openschool/internal/modules/mail"
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

	mailSender := newMailSender(pool)
	setupmodule.RegisterRoutes(groups.API, setupmodule.NewService(setupmodule.NewRepository(pool), thunderid.NewClient()))
	authmodule.RegisterRoutes(groups.API, groups.Protected, pool, peoplemodule.NewGuardianAuthenticator(pool), thunderid.NewClient(), mailSender)
	activationService := activationmodule.NewService(activationmodule.NewRepository(pool), thunderid.NewClient(), mailSender, auditService)
	if err := activationService.LoadCodeKey(); err != nil {
		log.Fatalf("activation: %v", err)
	}
	activationmodule.RegisterRoutes(groups.API, groups.Admin, activationService)
	identitymodule.Register(groups.Protected, pool)
	identitymodule.RegisterReconciliation(groups.Admin, pool, thunderid.NewClient(), auditService)
	auditmodule.RegisterRoutes(groups.Admin, auditService)
	leadershipmodule.RegisterRoutes(groups.Admin, groups.TeacherOrAdmin, leadershipService)
	studentleadershipmodule.RegisterRoutes(groups.Admin, groups.TeacherOrAdmin, groups.StudentAccess, studentLeadershipService)
	dashboardmodule.RegisterRoutes(groups.Admin, dashboardService)
	searchmodule.RegisterRoutes(groups.Admin, searchmodule.NewService(searchmodule.NewRepository(pool)))

	mailmodule.RegisterRoutes(groups.Admin, mailSender, mailmodule.NewRepository(pool))

	return sharedServices{
		audit: auditService, notifications: notifications, leadership: leadershipService,
		studentLeadership: studentLeadershipService, dashboard: dashboardService,
	}
}

// newMailSender stops startup on a broken mail setup, since reset and activation links depend on it.
func newMailSender(pool *pgxpool.Pool) *emails.Sender {
	cfg, err := mailer.ConfigFromEnv()
	if err != nil {
		log.Fatalf("mail configuration: %v", err)
	}
	if os.Getenv("APP_ENV") == "production" {
		if err := cfg.CheckProduction(); err != nil {
			log.Fatalf("mail configuration: %v", err)
		}
	}
	log.Printf("mail: provider=%s from=%s test_redirect=%t", cfg.Provider, cfg.From.String(), cfg.RedirectTo != "")
	if strings.HasSuffix(cfg.From.Address, "@resend.dev") && cfg.RedirectTo == "" {
		log.Printf("mail: WARNING %s only delivers to your own Resend account inbox; set MAIL_REDIRECT_TO to it, or verify a domain", cfg.From.Address)
	}
	return emails.NewSender(mailer.New(cfg), cfg, mailmodule.NewRepository(pool))
}
