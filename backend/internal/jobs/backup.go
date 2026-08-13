package jobs

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/db/migrations"
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
	// 0700: the dump files inside contain the full DB, including password
	// hashes and personal data — no reason for other local users to even
	// list the directory.
	if err := os.MkdirAll(j.backupDir, 0o700); err != nil {
		return fmt.Errorf("could not create backup directory %q: %w", j.backupDir, err)
	}

	passfile, err := writeTempPgPassFile()
	if err != nil {
		return fmt.Errorf("could not prepare pg_dump credentials: %w", err)
	}
	defer os.Remove(passfile)

	filename := fmt.Sprintf("openschool_%s.dump", time.Now().UTC().Format("20060102_150405"))
	outPath := filepath.Join(j.backupDir, filename)

	// A connection URI with no password — process listings (ps aux,
	// /proc/<pid>/cmdline) are readable by any local user on the host, so
	// the password travels via PGPASSFILE (env var below) instead, which
	// only this process's own environment/file permissions expose.
	connURL := (&url.URL{
		Scheme:   "postgres",
		User:     url.User(os.Getenv("DB_USER")),
		Host:     fmt.Sprintf("%s:%s", os.Getenv("DB_HOST"), os.Getenv("DB_PORT")),
		Path:     "/" + os.Getenv("DB_NAME"),
		RawQuery: "sslmode=" + os.Getenv("DB_SSLMODE"),
	}).String()

	cmd := exec.CommandContext(ctx, "pg_dump", connURL, "-F", "c", "-f", outPath)
	cmd.Env = append(os.Environ(), "PGPASSFILE="+passfile)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("pg_dump failed (is the postgresql-client package installed on this host?): %w: %s", err, strings.TrimSpace(string(output)))
	}
	return nil
}

// writeTempPgPassFile writes a mode-0600 temp file in libpq's PGPASSFILE
// format (hostname:port:database:username:password) so pg_dump's password
// never appears as a process argument. Host/port/database are wildcarded —
// this job only ever connects to one database, so there's no ambiguity to
// resolve and no need to keep the URL's exact formatting in sync with this
// file's fields.
func writeTempPgPassFile() (string, error) {
	f, err := os.CreateTemp("", "openschool-pgpass-*")
	if err != nil {
		return "", err
	}
	defer f.Close()
	if err := f.Chmod(0o600); err != nil {
		os.Remove(f.Name())
		return "", err
	}
	line := fmt.Sprintf("*:*:*:%s:%s\n", pgpassEscape(os.Getenv("DB_USER")), pgpassEscape(os.Getenv("DB_PASSWORD")))
	if _, err := f.WriteString(line); err != nil {
		os.Remove(f.Name())
		return "", err
	}
	return f.Name(), nil
}

// pgpassEscape backslash-escapes colons and backslashes per the PGPASSFILE
// format (https://www.postgresql.org/docs/current/libpq-pgpass.html).
func pgpassEscape(s string) string {
	s = strings.ReplaceAll(s, `\`, `\\`)
	return strings.ReplaceAll(s, `:`, `\:`)
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
