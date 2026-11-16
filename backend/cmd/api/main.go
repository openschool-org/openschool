package main

import (
	// Embedded zone data, so SCHOOL_TIMEZONE works in a minimal container image.
	_ "time/tzdata"

	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/gzip"
	"github.com/gin-gonic/gin"
	"github.com/openschool-org/openschool/internal/app"
	"github.com/openschool-org/openschool/internal/config"
	"github.com/openschool-org/openschool/internal/database"
	"github.com/openschool-org/openschool/internal/idp"
	"github.com/openschool-org/openschool/internal/middleware"
	"github.com/prometheus/client_golang/prometheus/promhttp"

	_ "github.com/openschool-org/openschool/docs"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

func envFloat(key string, fallback float64) float64 {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.ParseFloat(v, 64)
	if err != nil {
		return fallback
	}
	return n
}

func envInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}

// splitEnvList parses a comma-separated environment variable into its
// trimmed, non-empty entries, or nil if unset.
func splitEnvList(key string) []string {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return nil
	}
	parts := strings.Split(v, ",")
	result := make([]string, 0, len(parts))
	for _, p := range parts {
		if p = strings.TrimSpace(p); p != "" {
			result = append(result, p)
		}
	}
	return result
}

// @title           OpenSchool API
// @version         0.4.0
// @description     Digital Infrastructure for Sri Lankan Schools
// @host            localhost:8080
// @BasePath        /api/v1
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and your JWT token. Example: "Bearer eyJhbGci..."
func main() {
	config.LoadEnv()

	loc, err := database.SetSchoolTimezone()
	if err != nil {
		log.Fatalf("timezone: %v", err)
	}
	log.Printf("timezone: %s", loc)

	dsn := database.BuildDSN()

	if err := database.RunMigrations(dsn); err != nil {
		log.Fatalf("migrations failed: %v", err)
	}
	log.Println("migrations ok")

	db, err := database.Connect(dsn)
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}
	defer db.Close()
	log.Println("database connected")

	// init JWKS for JWT validation
	jwksURL := idp.JWKSURL()
	if err := middleware.InitJWKS(jwksURL); err != nil {
		log.Fatalf("failed to init JWKS: %v", err)
	}
	log.Println("JWKS initialized")

	corsOrigins := strings.Split(os.Getenv("CORS_ORIGINS"), ",")
	if len(corsOrigins) == 1 && corsOrigins[0] == "" {
		corsOrigins = []string{"http://localhost:5173"}
	}

	// gin.Default() logs every request line, including query strings — search
	// terms, names and index numbers would end up in plain-text logs (S10).
	// gin.New() plus an explicit Recovery and StructuredLogger replaces it.
	r := gin.New()
	// Handlers that pass *gin.Context as a context get the request's deadline
	// and cancellation too; without this gin.Context.Done() is nil and the
	// 15s RequestTimeout below never reached them (S9).
	r.ContextWithFallback = true
	r.Use(gin.Recovery())
	r.Use(middleware.RequestID())
	r.Use(middleware.StructuredLogger())
	r.Use(middleware.Metrics())
	r.Use(middleware.RequestTimeout(15 * time.Second))

	// Trusted proxies must be explicit: behind Nginx, ClientIP() otherwise
	// returns the proxy's own address for every request, making per-IP rate
	// limits and audit IPs meaningless (S3). Empty means "no proxy in front",
	// matching the previous SetTrustedProxies(nil) default.
	// Outside development an empty value is refused: behind nginx it would put
	// the whole school in one rate-limit bucket (E7). A server reached
	// directly, with no proxy, says so with TRUSTED_PROXIES=none.
	trustedProxies := splitEnvList("TRUSTED_PROXIES")
	if len(trustedProxies) == 1 && strings.EqualFold(trustedProxies[0], "none") {
		trustedProxies = nil
	} else if len(trustedProxies) == 0 && os.Getenv("APP_ENV") != "development" {
		log.Fatal("TRUSTED_PROXIES is required outside development: set the reverse proxy's address, or \"none\" if clients reach the API directly")
	}
	if len(trustedProxies) == 0 {
		r.SetTrustedProxies(nil)
	} else if err := r.SetTrustedProxies(trustedProxies); err != nil {
		log.Fatalf("invalid TRUSTED_PROXIES: %v", err)
	}

	r.Use(middleware.SecurityHeaders())
	r.Use(middleware.BodySizeLimit())
	// JSON list responses shrink 5-10x over gzip (section 5's delivery checklist).
	r.Use(gzip.Gzip(gzip.DefaultCompression))
	r.Use(cors.New(cors.Config{
		AllowOrigins:     corsOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))
	// Generous per-IP rate limit prevents throttling users behind shared school networks.
	r.Use(middleware.RateLimit(envFloat("API_RATE_LIMIT_RPS", 30), envInt("API_RATE_LIMIT_BURST", 60)))

	// Root-level, unauthenticated and outside /api/v1 so a container
	// orchestrator's health check (Docker HEALTHCHECK, k8s probe) or the
	// reverse proxy can reach it without a token (section 5's Docker
	// checklist). Verifies the DB pool, not just that the process is alive.
	r.GET("/healthz", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()
		if err := db.Ping(ctx); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "unavailable"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	scheduler := app.Setup(r, db)
	scheduler.Start()
	defer scheduler.Stop()

	// Swagger is available only during development, not in production.
	if os.Getenv("APP_ENV") == "development" {
		r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// /metrics carries no auth of its own, so it's served on its own listener
	// bound to loopback rather than on the public API port — the reverse
	// proxy has no route to it, and reaching it requires access to the host
	// itself (e.g. a Prometheus scraper running as a sidecar).
	metricsPort := os.Getenv("METRICS_PORT")
	if metricsPort == "" {
		metricsPort = "9090"
	}
	metricsSrv := &http.Server{
		Addr:              "127.0.0.1:" + metricsPort,
		Handler:           promhttp.Handler(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server failed: %v", err)
		}
	}()
	log.Printf("listening on :%s", port)

	go func() {
		if err := metricsSrv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("metrics server failed: %v", err)
		}
	}()
	log.Printf("metrics listening on 127.0.0.1:%s", metricsPort)

	// A deploy mid-request must not drop it: wait for SIGTERM/SIGINT, then
	// stop accepting new connections and let in-flight ones finish (S13).
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGTERM, syscall.SIGINT)
	<-stop
	log.Println("shutting down")

	// The shutdown deadline must cover the longest request the server allows
	// (RequestTimeout, 15s) plus a cleanup margin, or a SIGTERM arriving just
	// after a slow request starts could make main exit while it's in flight.
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("graceful shutdown failed: %v", err)
	}
	metricsCtx, metricsCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer metricsCancel()
	if err := metricsSrv.Shutdown(metricsCtx); err != nil {
		log.Printf("metrics server shutdown failed: %v", err)
	}
}
