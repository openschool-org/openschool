package jobs

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/db/migrations"
	"github.com/openschool-org/openschool/internal/database"
)

const BackupJobName = "backup_migration_drift"

var migrationVersionRe = regexp.MustCompile(`^(\d+)_`)

// BackupJob is § Proposed — maintenance/ops agents item 1 (docs/plan.md):
// this is a single-instance, self-hosted deployment with no managed DB
// failover, so a bad migration or host failure is otherwise unrecoverable.
type BackupJob struct {
	pool      *pgxpool.Pool
	backupDir string
}

func NewBackupJob(pool *pgxpool.Pool) *BackupJob {
	dir := os.Getenv("JOB_BACKUP_DIR")
	if dir == "" {
		dir = "./backups"
	}
	return &BackupJob{pool: pool, backupDir: dir}
}

func (j *BackupJob) Name() string     { return BackupJobName }
func (j *BackupJob) Schedule() string { return "0 2 * * *" } // daily at 02:00
func (j *BackupJob) Description() string {
	return "Nightly pg_dump, plus a check that the DB's applied migration version matches what this binary expects."
}

func (j *BackupJob) Run(ctx context.Context) (Result, error) {
	var parts []string
	var errs []error

	if err := j.runBackup(ctx); err != nil {
		errs = append(errs, fmt.Errorf("backup: %w", err))
	} else {
		parts = append(parts, "backup ok")
	}

	drift, err := j.checkMigrationDrift(ctx)
	switch {
	case err != nil:
		errs = append(errs, fmt.Errorf("migration drift check: %w", err))
	case drift != "":
		errs = append(errs, fmt.Errorf("migration drift: %s", drift))
	default:
		parts = append(parts, "migrations up to date")
	}

	if len(errs) > 0 {
		return Result{Summary: strings.Join(parts, "; "), Findings: len(errs)}, errors.Join(errs...)
	}
	return Result{Summary: strings.Join(parts, "; "), Findings: 0}, nil
}

func (j *BackupJob) runBackup(ctx context.Context) error {
	if err := os.MkdirAll(j.backupDir, 0o755); err != nil {
		return fmt.Errorf("could not create backup directory %q: %w", j.backupDir, err)
	}

	filename := fmt.Sprintf("openschool_%s.dump", time.Now().UTC().Format("20060102_150405"))
	outPath := filepath.Join(j.backupDir, filename)

	// pg_dump accepts a connection URI directly as its first positional
	// arg — same DSN format internal/database builds for pgxpool, so no
	// separate credential wiring is needed here.
	cmd := exec.CommandContext(ctx, "pg_dump", database.BuildDSN(), "-F", "c", "-f", outPath)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("pg_dump failed (is the postgresql-client package installed on this host?): %w: %s", err, strings.TrimSpace(string(output)))
	}
	return nil
}

// checkMigrationDrift compares the DB's applied golang-migrate version
// against the highest migration file embedded in this binary. Queried with
// the raw pool rather than sqlc since schema_migrations is golang-migrate's
// own bookkeeping table, not one of ours.
func (j *BackupJob) checkMigrationDrift(ctx context.Context) (string, error) {
	var appliedVersion int64
	var dirty bool
	if err := j.pool.QueryRow(ctx, "SELECT version, dirty FROM schema_migrations").Scan(&appliedVersion, &dirty); err != nil {
		return "", fmt.Errorf("could not read schema_migrations: %w", err)
	}
	if dirty {
		return fmt.Sprintf("schema_migrations is marked dirty at version %d — a prior migration failed partway through", appliedVersion), nil
	}

	expected, err := highestEmbeddedMigrationVersion()
	if err != nil {
		return "", err
	}
	if appliedVersion != expected {
		return fmt.Sprintf("DB is at migration %d but this binary expects %d", appliedVersion, expected), nil
	}
	return "", nil
}

func highestEmbeddedMigrationVersion() (int64, error) {
	entries, err := migrations.FS.ReadDir(".")
	if err != nil {
		return 0, fmt.Errorf("could not list embedded migrations: %w", err)
	}
	var highest int64
	for _, entry := range entries {
		match := migrationVersionRe.FindStringSubmatch(entry.Name())
		if match == nil {
			continue
		}
		n, err := strconv.ParseInt(match[1], 10, 64)
		if err != nil {
			continue
		}
		if n > highest {
			highest = n
		}
	}
	return highest, nil
}
