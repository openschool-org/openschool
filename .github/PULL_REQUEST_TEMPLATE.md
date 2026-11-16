## Summary

<!--
What does this PR change?
Why is the change needed?
Keep this focused on the problem and outcome, not implementation details.
-->

### What changed?

*
*
*

### Why?

<!-- Link the issue/ticket if applicable. Explain the problem this PR solves. -->

Closes #

---

## Type of change

* [ ] Bug fix
* [ ] New feature
* [ ] Refactor / technical debt
* [ ] Performance
* [ ] Security
* [ ] Database / migration
* [ ] Documentation
* [ ] Tests
* [ ] CI / tooling
* [ ] Other:

---

## Affected areas

* [ ] Backend (`backend/`)
* [ ] Frontend (`frontend/`)
* [ ] Database migrations (`backend/db/migrations/`)
* [ ] SQL queries (`backend/db/queries/`)
* [ ] Generated code (`backend/db/sqlc/`)
* [ ] Authentication / authorization
* [ ] External integrations (ThunderID / SMTP)
* [ ] Background jobs / Automation
* [ ] Notifications
* [ ] CI / GitHub Actions
* [ ] Documentation

---

## Implementation notes

<!--
Call out anything reviewers should know that isn't obvious from the diff.
For example:
- architectural decisions
- authorization/scoping considerations
- migration/backfill behaviour
- performance implications
- compatibility concerns
- intentionally deferred work
-->

### Backend

<!-- Remove if not applicable. -->

* Module(s):
* API / endpoint changes:
* Authorization changes:
* Database/query changes:
* Background-job changes:

### Frontend

<!-- Remove if not applicable. -->

* Feature(s):
* Route / portal affected:
* UI / UX changes:
* Query / cache invalidation changes:
* New shared components or hooks:

### Database

<!-- Remove if not applicable. -->

* Migration(s):
* Schema changes:
* Data migration / backfill:
* Rollback considerations:

---

## API / data contract changes

* [ ] No API or data contract changes
* [ ] Existing endpoint/request/response changed
* [ ] New endpoint/request/response added
* [ ] Database schema/constraint changed
* [ ] Frontend/backend contract changed

<!--
If applicable, describe breaking changes, compatibility requirements,
or important request/response changes.
-->

---

## Security & authorization

* [ ] No security-sensitive behaviour changed
* [ ] Authentication behaviour changed
* [ ] Authorization / role checks changed
* [ ] Student ownership/access checks changed
* [ ] Rate limiting / request limits changed
* [ ] Sensitive data handling changed
* [ ] External identity-provider behaviour changed

<!--
If authorization changed, explain which roles can access the new/changed
behaviour and where the server-side enforcement lives.
-->

---

## Testing

### Automated checks

* [ ] `cd backend && go build ./...`
* [ ] `cd backend && go vet ./...`
* [ ] `cd backend && go test ./...`
* [ ] `cd frontend && pnpm lint`
* [ ] `cd frontend && pnpm test`
* [ ] `cd frontend && pnpm build`

<!-- Check only what is relevant. -->

### Additional testing

<!--
Describe manual verification, targeted tests, edge cases, or test data used.
Include commands where useful.
-->

*

---

## Database / generated code checklist

* [ ] Ran `sqlc generate` after changing SQL queries or migrations
* [ ] Did not hand-edit `backend/db/sqlc/`
* [ ] Migration has both `up` and `down` paths where appropriate
* [ ] Migration is safe for existing data
* [ ] Data/backfill behaviour has been verified
* [ ] No database changes

---

## Architecture checklist

* [ ] Backend changes follow the module/capability boundaries
* [ ] Module repositories are the only module files importing `db/sqlc`
* [ ] Cross-module dependencies use narrow interfaces / ports where appropriate
* [ ] Frontend feature boundaries are preserved
* [ ] No feature imports another feature's pages or API values
* [ ] Axios usage remains inside `api/` / `shared/api`
* [ ] Shared code has no feature-specific ownership
* [ ] No unnecessary duplication of existing shared UI/components
* [ ] No generated files were manually edited

---

## Documentation

* [ ] Documentation updated
* [ ] ADR needed
* [ ] ADR updated
* [ ] No documentation changes needed

<!--
If this introduces or changes a non-obvious architectural decision,
explain why an ADR is or isn't needed.
-->

---

## Screenshots / recordings

<!--
For frontend/UI changes, add before/after screenshots or a short recording.
Remove this section if not applicable.
-->

### Before

<!-- screenshot -->

### After

<!-- screenshot -->

---

## Reviewer notes

<!--
Anything specific you want reviewers to pay attention to?
Examples:
- "Please pay particular attention to authorization for teacher accounts."
- "The migration is intentionally non-reversible."
- "This follows the existing attendance list-page pattern."
-->

---

## Checklist

* [ ] I have tested the changes relevant to this PR
* [ ] I have checked for existing related work in `docs/development/issue.md`
* [ ] I have followed the relevant architecture/documentation guidance
* [ ] I have kept generated code out of manual edits
* [ ] I have added or updated tests where appropriate
* [ ] I have updated documentation where appropriate
* [ ] I have considered authorization and security implications
* [ ] I have kept this PR focused and reviewable
