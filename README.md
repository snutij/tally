# tally

[![CI](https://github.com/snutij/tally/actions/workflows/ci.yml/badge.svg)](https://github.com/snutij/tally/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Drop your bank CSV. Get a budget breakdown. Nothing leaves your machine.**

---

## Why

Every personal finance tool wants something from you — your bank login, a monthly fee, or blind trust that your transaction history is safe on their servers.

tally wants nothing. Just a CSV export from your bank.

A local AI model categorizes your transactions automatically. Your data lives in a SQLite file on your disk. No cloud. No account. No API key. Pull the plug and it still works.

## What

tally is a terminal tool that turns raw bank exports into a budget vs. actual breakdown:

- **Auto-import** — AI detects your CSV's column layout automatically, no mapping required
- **Auto-categorize** — regex rules for known merchants, LLM fallback for everything else
- **Budget report** — spending vs. targets across needs / wants / investments
- **Full control** — review uncategorized transactions, tweak rules, export to HTML or JSON

The AI is [Qwen 2.5 3B Instruct](https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF) running via [node-llama-cpp](https://github.com/withcatai/node-llama-cpp). One-time 2GB download. After that, fully offline.

## How

```
tally init          →   Download the AI model (once, ~2GB)
tally import csv    →   AI reads your CSV, categorizes transactions
tally transactions  →   Review and fix anything it missed
tally report        →   Budget vs. actual — terminal or HTML
```

---

## Quick Start

```bash
npm install
npm link

# 1. Download the AI model (~2GB, one-time)
tally init

# 2. Try it with 6 months of demo data
tally import demo
tally report

# 3. Or import your actual bank statement
tally import csv statement.csv
```

---

## Commands

### `tally init`

Downloads the AI model to `~/.local/share/tally/models/`. Run once before importing real CSVs. Override the model path with `TALLY_LLM_MODEL`.

### `tally import`

```bash
tally import csv <file>    # AI auto-detects columns, categorizes transactions
tally import demo          # 6 months of pre-categorized demo data (Jan–Jun 2026)
tally import mock [month]  # Single month of minimal test data
```

`tally import csv` pipeline:

1. LLM detects which columns are date, label, amount — no manual mapping
2. Regex rules categorize known merchants instantly (no LLM call)
3. LLM classifies remaining transactions
4. Anything unresolved surfaces in `tally transactions` for manual review

### `tally report`

```bash
tally report
tally report --needs 50 --wants 30 --invest 20   # custom targets

# HTML output
tally --format html report > report.html && open report.html
```

Default output is JSON — pipe to `jq` for slicing and filtering.

### `tally transactions`

Review and manually categorize transactions for a given month.

```bash
tally transactions 2026-03
```

### `tally rules`

Regex rules that run before the AI — fast, free, deterministic. Add rules for merchants you see every month.

```bash
tally rules list
tally rules add
tally rules remove
```

### `tally db`

```bash
tally db path    # Where is the database?
tally db reset   # Wipe everything and start fresh
```

---

## Privacy

| What         | Where                                 |
| ------------ | ------------------------------------- |
| AI model     | `~/.local/share/tally/models/`        |
| Database     | `~/.local/share/tally/tally.db`       |
| Custom model | `TALLY_LLM_MODEL=/path/to/model.gguf` |

After `tally init`, everything runs on-device. Bank CSVs and the database are gitignored — only synthetic fixtures are committed to this repo.

---

> Personal project, provided as-is. Not financial advice. Use at your own risk. Never commit real bank statements to version control.
