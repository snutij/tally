# Contributing

## Developer Guide

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript → dist/
npm run fmt          # Format (oxfmt)
npm run fmt:check    # Check formatting without writing
npm run lint         # Lint (oxlint)
npm run lint:fix     # Lint and auto-fix
npm run test         # Run tests once (vitest)
npm run test:watch   # Watch mode
npm run test:coverage
```

Pre-commit hooks run format check, lint, build, and tests automatically via the [pre-commit](https://pre-commit.com) framework:

```bash
pip install pre-commit
pre-commit install
```

## Architecture

Hexagonal (ports & adapters), four layers:

- **Domain** — entities, value objects, aggregates, and domain errors. No I/O, no framework dependencies. Invariants enforced at construction time.
- **Application** — use cases that orchestrate domain logic. Depends only on domain types and port interfaces (repositories, gateways). Split into commands and queries (CQRS).
- **Infrastructure** — concrete adapters: SQLite persistence (`better-sqlite3`), bank CSV importers, mock data.
- **Presentation** — CLI (Commander) that wires everything together in a composition root.

Tests use in-memory implementations of the repository ports — no database required.

Capability specifications live in `openspec/specs/` — each subdirectory is a named capability with a `spec.md` describing its requirements and scenarios.
