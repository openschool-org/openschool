package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

// LoadEnv loads .env into the process environment. A missing file is
// expected (e.g. production, where config comes from the real environment)
// and not logged; any other error — a malformed file — is, so a typo in
// .env doesn't silently fall through to every downstream os.Getenv seeing
// empty strings with no indication why.
func LoadEnv() {
	if err := godotenv.Load(); err != nil && !os.IsNotExist(err) {
		log.Printf("config: failed to load .env: %v", err)
	}
}
