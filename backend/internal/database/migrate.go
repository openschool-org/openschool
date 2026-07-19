package database

import (
	"fmt"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/pgx/v5"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/openschool-org/openschool/db/migrations"
)

func RunMigrations(dbURL string) error {
	migrationURL := "pgx5://" + dbURL[len("postgres://"):]

	source, err := iofs.New(migrations.FS, ".")
	if err != nil {
		return fmt.Errorf("failed to load embedded migrations: %w", err)
	}

	m, err := migrate.NewWithSourceInstance("iofs", source, migrationURL)
	if err != nil {
		return fmt.Errorf("failed to create migrator: %w", err)
	}
	defer m.Close()

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("migration failed: %w", err)
	}

	return nil
}
