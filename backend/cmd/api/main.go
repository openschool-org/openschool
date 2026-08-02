package main

import (
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/openschool-org/openschool/internal/config"
	"github.com/openschool-org/openschool/internal/database"
	"github.com/openschool-org/openschool/internal/identity"
	"github.com/openschool-org/openschool/internal/middleware"
	"github.com/openschool-org/openschool/internal/routes"

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

// @title           OpenSchool API
// @version         1.0
// @description     Digital Infrastructure for Sri Lankan Schools
// @host            localhost:8080
// @BasePath        /api/v1
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and your JWT token. Example: "Bearer eyJhbGci..."
func main() {
	config.LoadEnv()

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
	jwksURL := identity.JWKSURL()
	if err := middleware.InitJWKS(jwksURL); err != nil {
		log.Fatalf("failed to init JWKS: %v", err)
	}
	log.Println("JWKS initialized")

	corsOrigins := strings.Split(os.Getenv("CORS_ORIGINS"), ",")
	if len(corsOrigins) == 1 && corsOrigins[0] == "" {
		corsOrigins = []string{"http://localhost:5173"}
	}

	r := gin.Default()
	// No reverse proxy in front of this service by default; trusting all
	// proxies (Gin's default) would let a client spoof its own IP via
	// X-Forwarded-For, undermining rate limiting and IP-based logging.
	r.SetTrustedProxies(nil)
	r.Use(middleware.SecurityHeaders())
	r.Use(cors.New(cors.Config{
		AllowOrigins:     corsOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))
	// API-wide per-IP rate limit, on top of any endpoint-specific ones
	// (e.g. /setup/admin's stricter limiter). Kept generous by default: a
	// school's users are frequently behind one shared NAT/proxy IP, so a
	// tight limit here would throttle the whole school together, not just
	// an abusive client. Tune via env once real traffic patterns are known.
	r.Use(middleware.RateLimit(envFloat("API_RATE_LIMIT_RPS", 30), envInt("API_RATE_LIMIT_BURST", 60)))

	routes.Setup(r, db)

	// Swagger exposes the full API surface (routes, request/response
	// shapes); harmless to leave public, but there's no reason to serve it
	// outside development.
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
	log.Fatal(srv.ListenAndServe())
}
