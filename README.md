# tally

Budget vs. actual tracking from your terminal. Import bank CSVs, allocate by category, see where the money goes.

## Usage

```bash
npm install
npm link

# Initialize a monthly budget (27 default categories, grouped: needs/wants/investments)
tally budget init 2026-03

# View it
tally budget show 2026-03

# Import transactions from your bank
tally import credit-mutuel statement.csv

# See available bank adapters
tally import list

# Budget vs actual report
tally report 2026-03
```

Output is JSON — pipe to `jq` for slicing, or consume programmatically.

## Data

- SQLite database at `~/.local/share/tally/tally.db` (XDG convention, outside project tree)
- Bank CSVs and DB files are gitignored — only synthetic test fixtures are committed

## Tests

```bash
npm test           # run once
npm run test:watch # watch mode
```

## Architecture

Hexagonal (ports & adapters), four layers:

- **Domain** — entities, value objects, and domain errors. No dependencies on frameworks or I/O.
- **Application** — use cases that orchestrate domain logic. Depends only on domain and port interfaces (gateways).
- **Infrastructure** — concrete adapters: SQLite persistence, bank CSV importers.
- **Presentation** — CLI (Commander) that wires everything together in a composition root.

Tests use in-memory implementations of the repository ports, so they run without a database.

## Disclaimer

This is a personal project, provided as-is with no warranty. It is not financial software — it does not give financial advice, validate tax data, or guarantee accuracy. Use at your own risk. The author is not responsible for any data loss, incorrect calculations, or decisions made based on its output.

Never commit real bank statements or financial data to version control.
