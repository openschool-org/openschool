package main

import (
	"log"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/openschool-org/openschool/internal/config"
	"github.com/openschool-org/openschool/internal/database"
	"github.com/openschool-org/openschool/internal/middleware"
	"github.com/openschool-org/openschool/internal/routes"
)

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
	r.Use(cors.Default())

	routes.Setup(r, db)

	r.Run(":" + os.Getenv("PORT"))
}
