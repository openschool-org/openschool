package main

import (
	"log"
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/openschool-org/openschool/internal/config"
	"github.com/openschool-org/openschool/internal/database"
)

func main() {
	config.LoadEnv()

	dsn := database.BuildDSN()

	// migration before anything else
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

	r := gin.Default()
	r.Use(cors.Default())

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	r.Run(":8080")
}
