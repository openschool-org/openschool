#!/usr/bin/env bash
# Restore an OpenSchool backup written by the nightly system-health job.
#
#   scripts/restore.sh BACKUP_FILE TARGET_DB [AGE_IDENTITY_FILE]
#
# BACKUP_FILE        openschool_YYYYMMDD_HHMMSS.dump, or .dump.age when
#                    BACKUP_AGE_RECIPIENT was set (needs AGE_IDENTITY_FILE).
# TARGET_DB          database to restore into. It is created if missing and
#                    its existing objects are replaced. Use a new name (for
#                    example openschool_restore) for a restore drill.
# AGE_IDENTITY_FILE  the age private key matching BACKUP_AGE_RECIPIENT.
#
# Connection settings come from backend/.env (DB_HOST, DB_PORT, DB_USER,
# DB_PASSWORD). Stop the API first when restoring over the live database.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
die() { echo "ERROR: $1" >&2; exit 1; }

[[ $# -ge 2 ]] || die "usage: $0 BACKUP_FILE TARGET_DB [AGE_IDENTITY_FILE]"
BACKUP="$1"; TARGET="$2"; IDENTITY="${3:-}"
[[ -f "$BACKUP" ]] || die "backup file not found: $BACKUP"
for tool in pg_restore psql; do command -v "$tool" >/dev/null || die "$tool is required (postgresql client)"; done

if [[ -f "$ROOT_DIR/backend/.env" ]]; then
  set -a; . "$ROOT_DIR/backend/.env"; set +a
fi
export PGHOST="${DB_HOST:-localhost}" PGPORT="${DB_PORT:-5432}" PGUSER="${DB_USER:-postgres}" PGPASSWORD="${DB_PASSWORD:-}"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
DUMP="$BACKUP"
if [[ "$BACKUP" == *.age ]]; then
  command -v age >/dev/null || die "age is required to decrypt $BACKUP"
  [[ -n "$IDENTITY" && -f "$IDENTITY" ]] || die "an age identity file is needed for an encrypted backup"
  DUMP="$WORK/backup.dump"
  age -d -i "$IDENTITY" -o "$DUMP" "$BACKUP"
fi

# A readable table of contents proves the file is a complete custom-format dump.
pg_restore --list "$DUMP" >/dev/null || die "not a valid pg_dump custom-format file: $BACKUP"

if [[ "$TARGET" == "${DB_NAME:-}" ]]; then
  read -r -p "This replaces the live database '$TARGET'. Type its name to continue: " answer
  [[ "$answer" == "$TARGET" ]] || die "cancelled"
fi

if ! psql -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$TARGET'" | grep -q 1; then
  psql -d postgres -c "CREATE DATABASE \"$TARGET\"" >/dev/null
fi
pg_restore --clean --if-exists --no-owner --exit-on-error -d "$TARGET" "$DUMP"

students=$(psql -d "$TARGET" -tAc "SELECT COUNT(*) FROM student_profiles")
migration=$(psql -d "$TARGET" -tAc "SELECT version FROM schema_migrations")
echo "Restored into $TARGET: migration $migration, $students students."
