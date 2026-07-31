# Testing

The red/green split is defined in `CLAUDE.md` § Teaching Contract step 3: I write fixtures, factories, and empty test blocks; you write the assertions and the implementation. This file covers **what** to test, not who writes it.

Use a practical testing pyramid.

## Frontend

Prefer:

- Unit tests for pure utilities and important hooks
- Component tests for forms and interactive behavior
- Integration tests for feature workflows
- End-to-end tests only for high-value user journeys

## Backend

Prefer:

- Unit tests for domain rules
- API integration tests for route behavior and validation
- Database tests for important persistence behavior
- Migration verification when schema changes are significant

## High-value early workflows

1. Creating a student.
2. Associating a guardian with a minor student.
3. Editing a student's membership or rank information.
4. Searching and filtering students.
5. Recording attendance.
6. Archiving a student without losing history.

## Rules

For every bug fix, add a regression test when practical.

Do not test framework implementation details. Test observable behavior and business rules.

## Quality tooling

ESLint and Prettier for the web app. Ruff for Python, with type checking through mypy or Pyright. Do not weaken linting or type checking to make a change pass.
