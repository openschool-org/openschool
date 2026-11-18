#!/usr/bin/env bash
# Prepares and tags OpenSchool releases.
#
# Usage:
#   scripts/release.sh prepare <patch|minor|major|X.Y.Z> [--dry-run]
#   scripts/release.sh tag [--dry-run]
#   scripts/release.sh current
#
# prepare: bumps the version everywhere it is stored, moves the CHANGELOG
#          [Unreleased] notes under the new version and commits on a new
#          release/vX.Y.Z branch. Open a PR from that branch to main.
# tag:     run on main after the release PR is merged. Creates an annotated
#          vX.Y.Z tag on HEAD. Nothing is pushed; push the tag yourself.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# The frontend package.json is the source of truth for the current version.
PKG_JSON="frontend/package.json"
MAIN_GO="backend/cmd/api/main.go"
SWAGGER_JSON="backend/docs/swagger.json"
SWAGGER_YAML="backend/docs/swagger.yaml"
SWAGGER_GO="backend/docs/docs.go"
CHANGELOG="CHANGELOG.md"
VERSION_FILES=("$PKG_JSON" "$MAIN_GO" "$SWAGGER_JSON" "$SWAGGER_YAML" "$SWAGGER_GO")

SEMVER_RE='^[0-9]+\.[0-9]+\.[0-9]+$'
DRY_RUN=false

die() { echo "error: $*" >&2; exit 1; }
info() { echo "==> $*"; }

usage() {
  sed -n '2,13p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

run() {
  if $DRY_RUN; then echo "[dry-run] $*"; else "$@"; fi
}

current_version() {
  sed -n 's/^  "version": "\([^"]*\)",$/\1/p' "$PKG_JSON" | head -1
}

# Returns success when $1 is strictly greater than $2.
version_gt() {
  [ "$1" != "$2" ] && [ "$(printf '%s\n%s\n' "$1" "$2" | sort -V | tail -1)" = "$1" ]
}

next_version() {
  local current="$1" bump="$2" major minor patch
  IFS=. read -r major minor patch <<<"$current"
  case "$bump" in
    patch) echo "$major.$minor.$((patch + 1))" ;;
    minor) echo "$major.$((minor + 1)).0" ;;
    major) echo "$((major + 1)).0.0" ;;
    *) [[ "$bump" =~ $SEMVER_RE ]] || die "'$bump' is not patch, minor, major or X.Y.Z"
       echo "$bump" ;;
  esac
}

require_clean_tree() {
  git diff --quiet && git diff --cached --quiet \
    || die "working tree has uncommitted changes; commit or stash them first"
}

# Every stored version must agree before we bump, so drift is caught early.
check_versions_match() {
  local v="$1" f
  grep -q "^// @version[[:space:]]*$v$" "$MAIN_GO" || die "$MAIN_GO @version is not $v"
  grep -q "\"version\": \"$v\"" "$SWAGGER_JSON" || die "$SWAGGER_JSON version is not $v"
  grep -q "^  version: \"$v\"$" "$SWAGGER_YAML" || die "$SWAGGER_YAML version is not $v"
  grep -q "Version:[[:space:]]*\"$v\"," "$SWAGGER_GO" || die "$SWAGGER_GO Version is not $v"
  for f in "${VERSION_FILES[@]}"; do [ -f "$f" ] || die "missing $f"; done
}

# Fails when [Unreleased] has no notes, since a release needs a changelog entry.
check_unreleased_notes() {
  awk '
    /^## \[Unreleased\]/ { inside = 1; next }
    inside && /^## \[/ { exit }
    inside && /^- / { found = 1 }
    END { exit found ? 0 : 1 }
  ' "$CHANGELOG" || die "$CHANGELOG has no notes under [Unreleased]"
}

bump_files() {
  local old="$1" new="$2" date="$3"
  sed -i "s/^  \"version\": \"$old\",$/  \"version\": \"$new\",/" "$PKG_JSON"
  sed -i "s|^\(// @version[[:space:]]*\)$old$|\1$new|" "$MAIN_GO"
  sed -i "s/\"version\": \"$old\"/\"version\": \"$new\"/" "$SWAGGER_JSON"
  sed -i "s/^  version: \"$old\"$/  version: \"$new\"/" "$SWAGGER_YAML"
  sed -i "s/\(Version:[[:space:]]*\)\"$old\",/\1\"$new\",/" "$SWAGGER_GO"
  sed -i "s/^## \[Unreleased\]$/## [Unreleased]\n\n## [$new] - $date/" "$CHANGELOG"
}

cmd_prepare() {
  [ $# -ge 1 ] || usage 1
  local current new branch date
  current="$(current_version)"
  [[ "$current" =~ $SEMVER_RE ]] || die "could not read version from $PKG_JSON"
  new="$(next_version "$current" "$1")"
  version_gt "$new" "$current" || die "$new is not greater than current $current"

  branch="release/v$new"
  date="$(date +%Y-%m-%d)"

  require_clean_tree
  check_versions_match "$current"
  check_unreleased_notes
  git rev-parse -q --verify "refs/tags/v$new" >/dev/null && die "tag v$new already exists"
  git rev-parse -q --verify "refs/heads/$branch" >/dev/null && die "branch $branch already exists"

  info "Releasing $current -> $new ($date)"
  run git switch -c "$branch"
  if $DRY_RUN; then
    echo "[dry-run] would update: ${VERSION_FILES[*]} $CHANGELOG"
  else
    bump_files "$current" "$new" "$date"
    check_versions_match "$new"
    git add "${VERSION_FILES[@]}" "$CHANGELOG"
    git commit -q -m "chore(release): v$new"
    git --no-pager show --stat --oneline HEAD
  fi

  cat <<EOF

Next steps:
  1. Review the CHANGELOG entry and amend the commit if needed.
  2. git push -u origin $branch and open a PR to main.
  3. After the PR is merged: git switch main && git pull && make release-tag
EOF
}

cmd_tag() {
  local version tag
  version="$(current_version)"
  tag="v$version"

  [ "$(git branch --show-current)" = "main" ] || die "switch to main before tagging"
  require_clean_tree
  check_versions_match "$version"
  grep -q "^## \[$version\] - " "$CHANGELOG" || die "$CHANGELOG has no [$version] section"
  git rev-parse -q --verify "refs/tags/$tag" >/dev/null && die "tag $tag already exists"

  info "Tagging $(git rev-parse --short HEAD) as $tag"
  run git tag -a "$tag" -m "OpenSchool $tag"
  echo
  echo "Push it with: git push origin $tag"
}

main() {
  local args=() a
  for a in "$@"; do
    case "$a" in
      --dry-run) DRY_RUN=true ;;
      -h|--help) usage 0 ;;
      *) args+=("$a") ;;
    esac
  done
  set -- "${args[@]+"${args[@]}"}"

  case "${1:-}" in
    prepare) shift; cmd_prepare "$@" ;;
    tag) cmd_tag ;;
    current) current_version ;;
    *) usage 1 ;;
  esac
}

main "$@"
