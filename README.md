# tally

[![CI](https://github.com/snutij/tally/actions/workflows/ci.yml/badge.svg)](https://github.com/snutij/tally/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Personal finance CLI powered by a local AI model. Import bank CSVs, let the AI categorize your transactions, and get a budget vs. actual breakdown — all from the terminal. No cloud, no API keys, no data leaving your machine.

## How it works

```
tally init          →   Download the AI model (one-time, ~2GB)
tally import csv    →   AI maps your CSV columns + categorizes transactions
tally transactions  →   Review and fix any uncategorized items
tally report        →   Budget vs. actual across all your data
```

The AI runs locally using [Qwen 2.5 3B Instruct](https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF) via [node-llama-cpp](https://github.com/withcatai/node-llama-cpp). After the initial model download, tally works entirely offline. No API key required. Nothing is ever sent to a server.

## Quick Start

```bash
npm install
npm link

# Step 1: Download the AI model (~2GB, one-time)
tally init

# Step 2: Seed 6 months of demo data to explore
tally import demo

# Step 3: View your budget vs. actual report
tally report
```

Or import your real bank data:

```bash
tally import csv statement.csv   # AI maps columns + categorizes automatically
```

## Commands

### `tally init`

Download the AI model for local inference. Run once before using `tally import csv`.

```bash
tally init
```

The model is stored at `~/.local/share/tally/models/`. Override with `TALLY_LLM_MODEL`.

### `tally import`

```bash
tally import csv <file>    # AI-assisted: auto-detects columns, categorizes transactions
tally import demo          # Seed 6 months of pre-categorized demo data (Jan–Jun 2026)
tally import mock [month]  # Seed a single month of minimal test data
```

**`tally import csv`** is AI-assisted:

1. The LLM detects which CSV columns map to date, label, and amount — no manual column mapping needed
2. Auto-categorization rules run first (fast regex matches)
3. Remaining uncategorized transactions go to the LLM for classification
4. Any the AI can't resolve are listed for manual review via `tally transactions`

### `tally report`

Generate a budget vs. actual report across all available transaction data.

```bash
tally report
tally report --needs 50 --wants 30 --invest 20   # custom 50/30/20 targets
```

Output is JSON — pipe to `jq` for slicing. For an HTML report:

```bash
tally --format html report > report.html && open report.html
```

### `tally transactions`

List and categorize transactions for a given month.

```bash
tally transactions 2026-03
```

### `tally rules`

Manage auto-categorization rules (pattern → category). Rules run before the AI, so common merchants get categorized instantly without LLM inference.

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

## Privacy & Data

| What         | Where                                     |
| ------------ | ----------------------------------------- |
| AI model     | `~/.local/share/tally/models/`            |
| Database     | `~/.local/share/tally/tally.db`           |
| Custom model | Set `TALLY_LLM_MODEL=/path/to/model.gguf` |

After `tally init`, everything runs on-device. Bank CSVs and the database are gitignored — only synthetic fixtures are committed.

## Disclaimer

Personal project, provided as-is with no warranty. Not financial software — does not give financial advice, validate tax data, or guarantee accuracy. Use at your own risk. Never commit real bank statements to version control.
