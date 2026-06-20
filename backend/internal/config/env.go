package config

import "github.com/joho/godotenv"

func LoadEnv() {
	_ = godotenv.Load()
}
