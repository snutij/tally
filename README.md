# tally

[![CI](https://github.com/snutij/tally/actions/workflows/ci.yml/badge.svg)](https://github.com/snutij/tally/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Your bank CSV. A local AI. A budget that never leaves your machine.**

---

## Why

Every finance app wants something from you — your bank credentials, a monthly subscription, or blind trust that your transaction history is safe in someone else's cloud.

tally wants your CSV and nothing else. Export it from your bank, drop it in. A small AI model running on your own hardware categorizes every transaction. The result is a SQLite file on your disk. No account. No API key. No connection required after setup.

## What

tally is a terminal tool that turns raw bank exports into a clear picture of where your money goes:

- **Auto-detect** — AI reads your CSV's column layout automatically, no manual mapping
- **Auto-categorize** — known merchants match instantly via regex rules; AI handles the rest
- **Budget breakdown** — spending vs. targets across needs / wants / investments
- **Natural language queries** — ask anything in plain English, get a direct answer from your own data

The AI is [Qwen 2.5 3B Instruct](https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF) via [node-llama-cpp](https://github.com/withcatai/node-llama-cpp). One-time 2GB download. Fully offline after that.

## Quick Start

```bash
npm install
npm link

# 1. Download the AI model (~2GB, one-time)
tally init

# 2. Import your bank statement
tally import csv statement.csv

# 3. Get your budget breakdown
tally report | jq

# 4. Ask anything
tally ask "What did I spend the most on last month?"
```

---

## Commands

### `tally init`

Downloads the AI model to `~/.local/share/tally/models/`. Run once before importing. Override the model path with `TALLY_LLM_MODEL`.

### `tally import csv <file>`

```bash
tally import csv statement.csv
```

Import pipeline:

1. AI detects which columns are date, label, and amount — no manual mapping
2. Known merchants match instantly via regex rules (no AI call)
3. AI classifies the rest

### `tally report`

```bash
tally report
tally report | jq '.summary'
```

Outputs JSON. Pipe to `jq` for slicing and filtering.

### `tally ask <question>`

```bash
tally ask "How much did I spend on Uber last month?"
tally ask "What are my top 5 spending categories this year?"
```

Natural language queries against your transaction history. Answered locally by the AI.

---

## Privacy

| What         | Where                                 |
| ------------ | ------------------------------------- |
| AI model     | `~/.local/share/tally/models/`        |
| Database     | `~/.local/share/tally/tally.db`       |
| Custom model | `TALLY_LLM_MODEL=/path/to/model.gguf` |

After `tally init`, everything runs on-device. Bank CSVs are never stored — only categorized transactions land in the database.

---

> Personal project, provided as-is. Not financial advice. Use at your own risk. Never commit real bank statements to version control.
