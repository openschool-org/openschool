## Summary

<!-- What changed and why. Link the issue if there is one. -->

Closes #

## Type of change

- [ ] Bug fix
- [ ] Feature
- [ ] Refactor
- [ ] Database / migration
- [ ] Security
- [ ] Docs / CI / tooling

## Notes for reviewers

<!--
Anything not obvious from the diff: API or schema changes, who can access
new behaviour and where the server enforces it, migration or rollback
concerns, deferred work. Delete if there is nothing to add.
-->

## Testing

<!-- What you ran and what you checked by hand. -->

## Screenshots

<!-- For UI changes: before and after. Delete if not a UI change. -->

## Checklist

- [ ] `go build`, `go vet`, `go test` pass (backend changes)
- [ ] `pnpm lint`, `pnpm test`, `pnpm build` pass (frontend changes)
- [ ] Ran `sqlc generate` after query or migration changes; `db/sqlc/` not hand-edited
- [ ] Migrations have working `up` and `down` files and are safe for existing data
- [ ] Follows the layer rules in `CLAUDE.md` and `docs/architecture/`
- [ ] Docs, CHANGELOG `[Unreleased]` and ADRs updated where needed
