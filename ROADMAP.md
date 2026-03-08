# Roadmap

## Budget editing — `budget set`

Interactive terminal prompt to edit amounts per category for a given month. Currently `budget init` creates all categories at zero — this slice lets you fill in actual planned amounts without touching the DB directly.

## Terminal renderer

Human-readable table output using chalk + cli-table3. Group rows by needs/wants/investments, color-code deltas (green = under budget, red = over). Activated via `--format terminal`, becomes the default for TTY output while JSON stays the default for pipes.

## Markdown renderer

`--format md` outputs a Markdown table suitable for pasting into Notion, Obsidian, or a GitHub issue. Useful for monthly reviews or sharing a snapshot without giving someone DB access.

## Transaction categorization

Auto-match imported transactions to categories based on configurable rules (label substring → category). Saves manual tagging. Rules stored in the DB, manageable via `tally rules add "MONOPRIX" groceries` and `tally rules list`.

## Multi-month trends

`tally trend 2026-01 2026-06` — compare budget vs actual across a date range. Surface patterns: which categories consistently overshoot, savings rate evolution, seasonal spikes.

## CSV export

`tally export 2026-03` — dump the month's report as CSV for spreadsheet users who want to do their own analysis or archive outside the DB.
