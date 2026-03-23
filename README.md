# tally

[![CI](https://github.com/snutij/tally/actions/workflows/ci.yml/badge.svg)](https://github.com/snutij/tally/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Track where your money actually goes. Import bank CSVs, categorize transactions, and get a budget vs. actual breakdown — all from the terminal.

No cloud, no subscriptions, no dashboards. Just a local SQLite database and a CLI.

## Quick Start

```bash
npm install
npm link

# Import mock data to explore
tally import mock

# Or import a real CSV
tally import csv statement.csv

# See all available reports (all imported months)
tally report

# Monthly report sub-view
tally report month 2026-03
```

## Commands

### `tally report`

Show all available report data (one summary per imported month).

```bash
tally report
tally report --needs 50 --wants 30 --invest 20
tally report month 2026-03
tally report month 2026-03 --needs 50 --wants 30 --invest 20
```

Output is JSON — pipe to `jq` for slicing. For an HTML report, redirect to a file:

```bash
tally --format html report > report.html && open report.html
tally --format html report month 2026-03 > report-2026-03.html && open report-2026-03.html
```

### `tally import`

```bash
tally import csv <file>          # Import any CSV (interactive column mapping)
tally import csv <file> --no-categorize  # Skip categorization prompt
tally import mock [month]        # Seed pre-categorized mock data
```

### `tally transactions <month>`

List transactions for a month, with optional interactive categorization.

```bash
tally transactions 2026-03
```

### `tally rules`

Manage auto-categorization rules (pattern → category mappings).

```bash
tally rules list
tally rules add
tally rules remove
```

### `tally db`

```bash
tally db path    # Print the database file path
tally db reset   # Delete the local database and start fresh
```

## Data

- SQLite database at `~/.local/share/tally/tally.db` (XDG convention, outside project tree)
- Bank CSVs and DB files are gitignored — only synthetic test fixtures are committed

## Disclaimer

This is a personal project, provided as-is with no warranty. It is not financial software — it does not give financial advice, validate tax data, or guarantee accuracy. Use at your own risk. The author is not responsible for any data loss, incorrect calculations, or decisions made based on its output.

Never commit real bank statements or financial data to version control.
