package main

import (
	"log"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/openschool-org/openschool/internal/config"
	"github.com/openschool-org/openschool/internal/database"
	"github.com/openschool-org/openschool/internal/middleware"
	"github.com/openschool-org/openschool/internal/routes"

	_ "github.com/openschool-org/openschool/docs"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

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
	jwksURL := os.Getenv("THUNDERID_JWKS_URL")
	if err := middleware.InitJWKS(jwksURL); err != nil {
		log.Fatalf("failed to init JWKS: %v", err)
	}
	log.Println("JWKS initialized")

	r := gin.Default()
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	routes.Setup(r, db)

	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	r.Run(":" + os.Getenv("PORT"))
}
