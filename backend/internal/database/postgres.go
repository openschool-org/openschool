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

func Connect(dsn string) (*pgxpool.Pool, error) {
	config, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to parse DSN: %w", err)
	}

	// Defaults sized for a single school's daily traffic (on the order of a
	// few thousand users, concentrated in bursts like morning attendance and
	// end-of-day notifications) rather than a bare-minimum dev default —
	// Postgres's own default max_connections is 100, so this still leaves
	// plenty of headroom for migrate/psql/other tools. Override via env for
	// a specific deployment's measured load.
	config.MaxConns = envInt32("DB_MAX_CONNS", 25)
	config.MinConns = envInt32("DB_MIN_CONNS", 5)
	config.MaxConnLifetime = 30 * time.Minute
	config.MaxConnIdleTime = 5 * time.Minute
	config.HealthCheckPeriod = time.Minute

	return pgxpool.NewWithConfig(context.Background(), config)
}

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
