---
paths:
  - "apps/api/**/*.py"
---

# Python, FastAPI, and the API

## Python and FastAPI Learning Guidance

Help me learn idiomatic modern Python rather than writing TypeScript-style Python.

Prefer:

- Type hints
- Small, explicit functions
- Pydantic models at API boundaries
- SQLAlchemy models for persistence
- Dependency injection through FastAPI dependencies
- Alembic migrations
- `async` only where it provides a real benefit
- Clear separation between request schemas, persistence models, and domain operations
- pytest fixtures for reusable test setup

Explain Python-specific concepts when they arise, including mutability and reference behavior, dataclasses versus Pydantic models, exceptions, context managers, iterators and comprehensions, sync versus async execution, Python packaging and virtual environments, ORM session lifecycle, and type-checking limitations and conventions.

Avoid:

- Translating TypeScript patterns mechanically into Python
- Catching broad exceptions without a reason
- Mutable default arguments
- Business logic embedded directly in route handlers
- Returning raw ORM objects without an intentional response schema
- Introducing async complexity before it is needed
- Hiding important behavior behind metaprogramming

## API Design Standards

Prefer REST-style APIs with predictable resource naming. Example resource areas: `/students`, `/guardians`, `/households`, `/programs`, `/memberships`, `/ranks`, `/class-sessions`, `/attendance-records`.

Use clear request and response schemas, consistent error responses, appropriate HTTP status codes, pagination for collections, filtering and sorting where useful, stable identifiers, server-side validation, and explicit archival or status transitions where records should not be deleted.

Do not permanently delete important student, membership, rank, or attendance history without an explicit requirement. Prefer archival or status changes for operational records.

When changing an API contract:

1. Update the Pydantic schemas.
2. Update backend tests.
3. Update generated or shared frontend types if used.
4. Update frontend consumers.
5. Document any migration or compatibility impact.

## Domain and Data-Model Guidance

Model relationships deliberately. Likely relationships include:

- A household has one or more guardians.
- A household has one or more students.
- A student may have multiple guardians.
- A student may have membership history.
- A student has a current rank and may later have rank history.
- A program has many students or memberships.
- A class session belongs to a program or class definition.
- An attendance record links a student to a class session.

Do not assume every student is a minor or every household has exactly two guardians.

Prefer explicit status fields and history records where the business needs to preserve changes over time.

When proposing schema changes, discuss cardinality, nullability, uniqueness, indexes, delete behavior, historical data, migration impact, and personally identifiable information.

## Backend conventions

- Every schema change goes through an Alembic migration. Never alter the database by hand.
- Prefer correct data access, pagination, and suitable indexes over micro-optimization. Do not denormalize or add caching without a measured reason. When proposing an optimization, explain what work occurs now, the observed or expected bottleneck, why the fix helps, its maintenance cost, and how to verify the benefit.
