# Contributing

This repository uses a lightweight GitHub Flow. `main` is the only long-lived
branch and should always be deployable. All changes reach `main` through a pull
request.

## Start a change

Update your local `main`, then create a short-lived branch:

```bash
git switch main
git pull --ff-only origin main
git switch -c feature/short-description
```

Use one of these branch prefixes:

- `feature/` for user-facing functionality
- `fix/` for bug fixes
- `refactor/` for behavior-preserving code changes
- `test/` for test-only changes
- `docs/` for documentation
- `chore/` for maintenance and dependencies
- `setup/` for project infrastructure

Use lowercase kebab-case after the prefix, such as
`feature/student-attendance`.

## Commit changes

Make focused commits with an imperative subject. Use a Conventional Commit type
so history remains easy to scan:

```text
feat: add student attendance history
fix: reject duplicate student email addresses
docs: document local database setup
chore: update frontend dependencies
```

Before committing, check staged content and make sure no credentials or local
environment files are included:

```bash
git diff --staged
git status
```

## Open a pull request

Push the branch and open a pull request into `main`:

```bash
git push -u origin HEAD
```

Keep the pull request small enough to review. Complete the pull-request
checklist, wait for required checks to pass, and address review feedback. Use
**Squash and merge** so each pull request becomes one clear commit on `main`.
Delete the remote branch after merging.

Then refresh your local repository:

```bash
git switch main
git pull --ff-only origin main
git branch -d feature/short-description
```

## Releases

Create releases from `main` with annotated semantic-version tags:

```bash
git switch main
git pull --ff-only origin main
git tag -a v0.2.0 -m "Release v0.2.0"
git push origin v0.2.0
```

Increment the major version for incompatible changes, the minor version for
backward-compatible features, and the patch version for backward-compatible
fixes. Do not commit directly to release tags or maintain a separate release
branch unless the project later needs parallel supported versions.

## Recommended GitHub settings

Protect `main` in **Settings > Branches > Branch protection rules**:

- Require a pull request before merging.
- Require at least one approval when more than one contributor is active.
- Require conversation resolution before merging.
- Require status checks once CI is configured.
- Block force pushes and branch deletion.
- Enable automatic deletion of merged branches.

Store credentials in local `.env` files and commit only the matching
`.env.example` files with safe placeholder values.
