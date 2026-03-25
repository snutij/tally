# Contributing

## Getting Started

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
- **Infrastructure** — concrete adapters: SQLite persistence (`better-sqlite3`), bank CSV importers, LLM gateway (`node-llama-cpp`), mock/demo data generators.
- **Presentation** — CLI (Commander) that wires everything together in a composition root (`src/presentation/index.ts`).

## LLM Infrastructure

tally uses a local LLM for two workflows: CSV column detection and transaction categorization.

### Ports (application layer)

| Port                     | Location                                             | Purpose                                    |
| ------------------------ | ---------------------------------------------------- | ------------------------------------------ |
| `LlmGateway`             | `src/application/gateway/llm-gateway.ts`             | Sends a prompt, returns structured JSON    |
| `CsvColumnMapper`        | `src/application/gateway/csv-column-mapper.ts`       | Maps CSV headers → semantic fields         |
| `TransactionCategorizer` | `src/application/gateway/transaction-categorizer.ts` | Assigns category IDs to transaction labels |

### Adapters (infrastructure layer)

| Adapter                     | Location                                                | Details                                                             |
| --------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------- |
| `NodeLlamaCppGateway`       | `src/infrastructure/llm/node-llama-cpp-gateway.ts`      | Loads the GGUF model, runs constrained JSON inference               |
| `LlmCsvColumnMapper`        | `src/infrastructure/llm/llm-csv-column-mapper.ts`       | Implements `CsvColumnMapper` via LLM prompt                         |
| `LlmTransactionCategorizer` | `src/infrastructure/llm/llm-transaction-categorizer.ts` | Implements `TransactionCategorizer`, batches labels in groups of 50 |

### Model resolution

The model path is resolved in this order:

1. `TALLY_LLM_MODEL` environment variable (absolute path to any `.gguf` file)
2. `~/.local/share/tally/models/hf_Qwen_qwen2.5-3b-instruct-q4_k_m.gguf` (default)

Default model: **Qwen 2.5 3B Instruct Q4** downloaded from HuggingFace via `tally init`.

To use a different model during development:

```bash
TALLY_LLM_MODEL=/path/to/your-model.gguf tally import csv statement.csv
```

### Testing without the model

Tests use in-memory mocks implementing the `LlmGateway` port. The real `NodeLlamaCppGateway` is never instantiated during `npm run test` — no model download required.

```typescript
// Example: mocking LlmGateway in a test
const mockLlmGateway: LlmGateway = {
  complete: vi.fn().mockResolvedValue({ "1": "w02", "2": "n01" }),
};
const categorizer = new LlmTransactionCategorizer(mockLlmGateway);
```

Capability specifications live in `openspec/specs/` — each subdirectory is a named capability with a `spec.md` describing its requirements and scenarios.
