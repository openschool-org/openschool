package automation

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"slices"
	"sort"
	"strconv"
	"strings"
	"time"

	"filippo.io/age"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/db/migrations"
	"github.com/openschool-org/openschool/internal/modules/notifications"
)

// SystemHealthAgentName is this agent's stable job_settings/job_runs identifier.
const SystemHealthAgentName = "system_health_agent"

// maxRetainedBackups bounds how many nightly dumps accumulate on disk before the oldest are pruned.
const maxRetainedBackups = 14

// minBackupsForSizeBaseline is the minimum prior dumps on disk before a size comparison is trusted.
const minBackupsForSizeBaseline = 3

// backupSizeAnomalyRatio is the fraction of the recent median size below which a new dump is flagged as possibly incomplete.
const backupSizeAnomalyRatio = 0.5

// migrationVersionRe extracts the leading numeric version from a migration filename.
var migrationVersionRe = regexp.MustCompile(`^(\d+)_`)

// backupFileRe matches this agent's own backup filename pattern (plaintext
// or age-encrypted), so a stray unrelated file is never pruned or counted.
var backupFileRe = regexp.MustCompile(`^openschool_\d{8}_\d{6}\.dump(\.age)?$`)

// SystemHealthAgent runs the nightly backup, migration-drift check, backup retention pruning, and dump-size anomaly detection.
type SystemHealthAgent struct {
	pool      *pgxpool.Pool
	checks    *Repository
	notifSvc  *notifications.NotificationService
	backupDir string
}

// NewSystemHealthAgent constructs a SystemHealthAgent with its dependencies, defaulting backupDir to JOB_BACKUP_DIR or ./backups.
func NewSystemHealthAgent(pool *pgxpool.Pool, checks *Repository, notifSvc *notifications.NotificationService) *SystemHealthAgent {
	dir := os.Getenv("JOB_BACKUP_DIR")
	if dir == "" {
		dir = "./backups"
	}
	return &SystemHealthAgent{pool: pool, checks: checks, notifSvc: notifSvc, backupDir: dir}
}

// Name returns this agent's job_settings/job_runs identifier.
func (a *SystemHealthAgent) Name() string { return SystemHealthAgentName }

// Schedule returns this agent's cron expression: daily 02:00.
func (a *SystemHealthAgent) Schedule() string { return "0 2 * * *" }

// Description returns the one-line summary shown on the Automation panel.
func (a *SystemHealthAgent) Description() string {
	return "Nightly pg_dump with retention pruning and dump-size anomaly detection, plus a check that the DB's applied migration version matches what this binary expects."
}

// Run backs up the database, prunes old backups, checks for a size anomaly, and checks for migration drift.
func (a *SystemHealthAgent) Run(ctx context.Context) (Result, error) {
	var parts []string
	var errs []error

	dumpPath, backupErr := a.runBackup(ctx)
	if backupErr != nil {
		errs = append(errs, fmt.Errorf("backup: %w", backupErr))
	} else {
		parts = append(parts, "backup ok")

		if anomaly, err := a.checkBackupSizeAnomaly(ctx, dumpPath); err != nil {
			errs = append(errs, fmt.Errorf("backup size check: %w", err))
		} else if anomaly != "" {
			parts = append(parts, anomaly)
		}

		if pruned, err := a.pruneOldBackups(); err != nil {
			errs = append(errs, fmt.Errorf("backup retention pruning: %w", err))
		} else if pruned > 0 {
			parts = append(parts, fmt.Sprintf("pruned %d old backup(s)", pruned))
		}
	}

	drift, err := a.checkMigrationDrift(ctx)
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

// runBackup writes a new pg_dump and returns its path for the size-anomaly check to stat.
func (a *SystemHealthAgent) runBackup(ctx context.Context) (string, error) {
	// S11: backups must be encrypted at rest outside local development —
	// fail closed rather than silently writing PII to disk in plaintext.
	// APP_ENV unset is treated as non-development.
	if os.Getenv("BACKUP_AGE_RECIPIENT") == "" && os.Getenv("APP_ENV") != "development" {
		return "", fmt.Errorf("BACKUP_AGE_RECIPIENT is required outside APP_ENV=development")
	}

	// 0700: the dump files inside contain the full DB, including password
	// hashes and personal data — no reason for other local users to even
	// list the directory.
	if err := os.MkdirAll(a.backupDir, 0o700); err != nil {
		return "", fmt.Errorf("could not create backup directory %q: %w", a.backupDir, err)
	}

	passfile, err := writeTempPgPassFile()
	if err != nil {
		return "", fmt.Errorf("could not prepare pg_dump credentials: %w", err)
	}
	defer os.Remove(passfile)

	filename := fmt.Sprintf("openschool_%s.dump", time.Now().UTC().Format("20060102_150405"))
	outPath := filepath.Join(a.backupDir, filename)

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
		return "", fmt.Errorf("pg_dump failed (is the postgresql-client package installed on this host?): %w: %s", err, strings.TrimSpace(string(output)))
	}

	finalPath := outPath
	// S11: a dump contains the full DB — password hashes, NIC numbers, phone
	// numbers, addresses. Encrypted at rest with an asymmetric age recipient
	// key, so the key that can decrypt a backup never has to live on the
	// same host that writes it.
	if recipient := os.Getenv("BACKUP_AGE_RECIPIENT"); recipient != "" {
		encPath, err := encryptBackupFile(outPath, recipient)
		if err != nil {
			return "", fmt.Errorf("could not encrypt backup: %w", err)
		}
		if err := os.Remove(outPath); err != nil {
			return encPath, fmt.Errorf("encrypted backup written to %s but failed to remove plaintext %s: %w", encPath, outPath, err)
		}
		finalPath = encPath
	} else {
		// Only reachable in APP_ENV=development — see the check above.
		log.Printf("system-health: BACKUP_AGE_RECIPIENT is not set — nightly backup %s is stored unencrypted", outPath)
	}

	// S11: a copy of the backup must survive the loss of this host.
	if offsiteDir := os.Getenv("BACKUP_OFFSITE_DIR"); offsiteDir != "" {
		if err := copyBackupFile(finalPath, offsiteDir); err != nil {
			return finalPath, fmt.Errorf("backup written locally but failed to copy to BACKUP_OFFSITE_DIR: %w", err)
		}
	} else {
		log.Printf("system-health: BACKUP_OFFSITE_DIR is not set — %s exists only on this host", finalPath)
	}

	return finalPath, nil
}

// encryptBackupFile encrypts plainPath in place (writing plainPath+".age")
// to the given age X25519 recipient (a public key, e.g. "age1...") and
// returns the encrypted file's path. The caller removes the plaintext.
func encryptBackupFile(plainPath, recipientStr string) (string, error) {
	recipient, err := age.ParseX25519Recipient(recipientStr)
	if err != nil {
		return "", fmt.Errorf("invalid BACKUP_AGE_RECIPIENT: %w", err)
	}

	in, err := os.Open(plainPath)
	if err != nil {
		return "", err
	}
	defer in.Close()

	encPath := plainPath + ".age"
	// 0600: same reasoning as the backup directory itself — this file holds the full DB.
	out, err := os.OpenFile(encPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0o600)
	if err != nil {
		return "", err
	}
	defer out.Close()

	w, err := age.Encrypt(out, recipient)
	if err != nil {
		return "", fmt.Errorf("could not open age stream: %w", err)
	}
	if _, err := io.Copy(w, in); err != nil {
		return "", fmt.Errorf("could not write encrypted backup: %w", err)
	}
	return encPath, w.Close()
}

// copyBackupFile copies src into destDir, preserving its filename, so a
// second location survives the loss of the host that wrote it.
func copyBackupFile(src, destDir string) error {
	if err := os.MkdirAll(destDir, 0o700); err != nil {
		return fmt.Errorf("could not create offsite backup directory %q: %w", destDir, err)
	}

	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	dest := filepath.Join(destDir, filepath.Base(src))
	if filepath.Clean(dest) == filepath.Clean(src) {
		return fmt.Errorf("offsite backup destination %q must differ from source", dest)
	}
	out, err := os.OpenFile(dest, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0o600)
	if err != nil {
		return err
	}
	defer out.Close()

	if _, err := io.Copy(out, in); err != nil {
		return err
	}
	return out.Close()
}

// writeTempPgPassFile writes a mode-0600 temp PGPASSFILE so pg_dump's password never appears as a process argument.
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

// pgpassEscape backslash-escapes colons and backslashes per the PGPASSFILE format.
func pgpassEscape(s string) string {
	s = strings.ReplaceAll(s, `\`, `\\`)
	return strings.ReplaceAll(s, `:`, `\:`)
}

// checkMigrationDrift compares the DB's applied golang-migrate version against the highest migration embedded in this binary.
func (a *SystemHealthAgent) checkMigrationDrift(ctx context.Context) (string, error) {
	var appliedVersion int64
	var dirty bool
	if err := a.pool.QueryRow(ctx, "SELECT version, dirty FROM schema_migrations").Scan(&appliedVersion, &dirty); err != nil {
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

// highestEmbeddedMigrationVersion returns the highest migration version number embedded in this binary.
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

// listBackupFiles returns the dump filenames currently in backupDir that match this agent's own naming pattern.
func (a *SystemHealthAgent) listBackupFiles() ([]string, error) {
	entries, err := os.ReadDir(a.backupDir)
	if err != nil {
		return nil, err
	}
	var files []string
	for _, e := range entries {
		if e.IsDir() || !backupFileRe.MatchString(e.Name()) {
			continue
		}
		files = append(files, e.Name())
	}
	return files, nil
}

// pruneOldBackups keeps only the newest maxRetainedBackups dumps, relying on the filename's timestamp to sort chronologically.
func (a *SystemHealthAgent) pruneOldBackups() (int, error) {
	files, err := a.listBackupFiles()
	if err != nil {
		return 0, err
	}
	if len(files) <= maxRetainedBackups {
		return 0, nil
	}
	sort.Strings(files)
	toDelete := files[:len(files)-maxRetainedBackups]

	var errs []error
	deleted := 0
	for _, f := range toDelete {
		if err := os.Remove(filepath.Join(a.backupDir, f)); err != nil {
			errs = append(errs, err)
			continue
		}
		deleted++
	}
	if len(errs) > 0 {
		return deleted, errors.Join(errs...)
	}
	return deleted, nil
}

// checkBackupSizeAnomaly flags a new dump whose size is well below the median of prior dumps still on disk.
func (a *SystemHealthAgent) checkBackupSizeAnomaly(ctx context.Context, newDumpPath string) (string, error) {
	newInfo, err := os.Stat(newDumpPath)
	if err != nil {
		return "", fmt.Errorf("could not stat new dump: %w", err)
	}
	newSize := newInfo.Size()

	files, err := a.listBackupFiles()
	if err != nil {
		return "", err
	}

	newBase := filepath.Base(newDumpPath)
	var priorSizes []int64
	for _, f := range files {
		if f == newBase {
			continue
		}
		info, err := os.Stat(filepath.Join(a.backupDir, f))
		if err != nil {
			continue // best-effort; a file removed between listing and stat shouldn't fail the whole check
		}
		priorSizes = append(priorSizes, info.Size())
	}
	if len(priorSizes) < minBackupsForSizeBaseline {
		return "", nil // not enough history to judge yet
	}

	median := medianInt64(priorSizes)
	if median == 0 || float64(newSize) >= float64(median)*backupSizeAnomalyRatio {
		return "", nil
	}

	summary := fmt.Sprintf("latest backup is %d bytes, well below the recent median of %d bytes across %d prior backup(s) — possible incomplete dump", newSize, median, len(priorSizes))
	if err := notifyAdmins(ctx, a.checks, a.notifSvc, "Nightly backup size anomaly detected",
		summary, "general", SeverityElevated); err != nil {
		return summary, fmt.Errorf("detected anomaly but failed to notify admins: %w", err)
	}
	return summary, nil
}

// medianInt64 returns the median of vals without mutating the input slice.
func medianInt64(vals []int64) int64 {
	sorted := append([]int64(nil), vals...)
	slices.Sort(sorted)
	n := len(sorted)
	if n == 0 {
		return 0
	}
	if n%2 == 1 {
		return sorted[n/2]
	}
	return (sorted[n/2-1] + sorted[n/2]) / 2
}

// Title is the agent's name on the Automation panel.
func (a *SystemHealthAgent) Title() string { return "System health" }

// CanDisable reports whether an admin may switch this agent off.
func (a *SystemHealthAgent) CanDisable() bool { return false }

// Checks lists what this agent checks and where each finding is shown.
func (a *SystemHealthAgent) Checks() []CheckInfo {
	return []CheckInfo{
		{Key: "backup", Title: "Nightly backup", Description: "Takes the nightly database backup and keeps the most recent copies."},
		{Key: "migration_drift", Title: "Schema matches the code", Description: "Checks the database schema version matches what this build expects."},
		{Key: "backup_size", Title: "Backup size", Description: "Flags a backup much smaller or larger than recent ones, a sign of lost or corrupted data.", FindingTitle: "Nightly backup size anomaly detected", Pages: []string{"/settings"}},
	}
}
