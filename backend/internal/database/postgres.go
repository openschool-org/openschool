package database

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// BuildDSN builds a Postgres connection string from the DB_* environment variables.
func BuildDSN() string {
	u := url.URL{
		Scheme:   "postgres",
		User:     url.UserPassword(os.Getenv("DB_USER"), os.Getenv("DB_PASSWORD")),
		Host:     fmt.Sprintf("%s:%s", os.Getenv("DB_HOST"), os.Getenv("DB_PORT")),
		Path:     "/" + os.Getenv("DB_NAME"),
		RawQuery: "sslmode=" + os.Getenv("DB_SSLMODE"),
	}
	return u.String()
}

// Connect opens a pooled connection to the database at dsn.
func Connect(dsn string) (*pgxpool.Pool, error) {
	config, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to parse DSN: %w", err)
	}

	// Defaults support typical school traffic while remaining configurable through environment variables.
	config.MaxConns = envInt32("DB_MAX_CONNS", 25)
	config.MinConns = envInt32("DB_MIN_CONNS", 5)
	config.MaxConnLifetime = 30 * time.Minute
	config.MaxConnIdleTime = 5 * time.Minute
	config.HealthCheckPeriod = time.Minute
	// A slow or runaway query must not hold a pooled connection indefinitely under load (S15).
	if config.ConnConfig.RuntimeParams == nil {
		config.ConnConfig.RuntimeParams = map[string]string{}
	}
	config.ConnConfig.RuntimeParams["statement_timeout"] = strconv.FormatInt(int64(envInt32("DB_STATEMENT_TIMEOUT_MS", 10_000)), 10)
	// CURRENT_DATE and NOW()::date follow the school's day, not the server's UTC (E5).
	config.ConnConfig.RuntimeParams["timezone"] = time.Local.String()

	return pgxpool.NewWithConfig(context.Background(), config)
}

// envInt32 reads an integer environment variable, falling back to a default if unset or invalid.
func envInt32(key string, fallback int32) int32 {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.ParseInt(v, 10, 32)
	if err != nil {
		return fallback
	}
	return int32(n)
}

// DefaultSchoolTimezone is used when SCHOOL_TIMEZONE is not set.
const DefaultSchoolTimezone = "Asia/Colombo"

// SetSchoolTimezone makes SCHOOL_TIMEZONE (default Asia/Colombo) the process's
// local time, so "today", cron schedules ("02:00" backups) and the database
// session all use the school's clock instead of the container's UTC (E5).
// Call it before Connect and before the scheduler starts.
func SetSchoolTimezone() (*time.Location, error) {
	name := os.Getenv("SCHOOL_TIMEZONE")
	if name == "" {
		name = DefaultSchoolTimezone
	}
	loc, err := time.LoadLocation(name)
	if err != nil {
		return nil, fmt.Errorf("SCHOOL_TIMEZONE %q: %w", name, err)
	}
	time.Local = loc
	return loc, nil
}
