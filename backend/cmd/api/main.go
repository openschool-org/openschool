package main

import (
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"github.com/openschool-org/openschool/internal/config"
	"github.com/openschool-org/openschool/internal/database"
)

func main() {
	config.LoadEnv()

	db, err := database.Connect()
	if err != nil {
		panic(err)
	}
	defer db.Close()

	r := gin.Default()

	r.Use(cors.Default())

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "ok",
		})
	})

	r.GET("/test-db", func(c *gin.Context) {
		var result int

		err := db.QueryRow(c, "SELECT 1").Scan(&result)
		if err != nil {
			c.JSON(500, gin.H{
				"success": false,
			})
			return
		}

		c.JSON(200, gin.H{
			"success": true,
			"result":  result,
		})
	})

	r.Run(":8080")
}
