# Roadmap

## Features

### Terminal renderer

Human-readable table output using chalk + cli-table3. Group rows by needs/wants/investments, color-code deltas (green = under target, red = over). Activated via `--format terminal`, becomes the default for TTY output while JSON stays the default for pipes.

### Markdown renderer

`--format md` outputs a Markdown table suitable for pasting into Notion, Obsidian, or a GitHub issue. Useful for monthly reviews or sharing a snapshot without giving someone DB access.

### Multi-month trends

`tally trend 2026-01 2026-06` — compare target vs actual across a date range. Surface patterns: which groups consistently overshoot, savings rate evolution, seasonal spikes.

### CSV export

`tally export 2026-03` — dump the month's report as CSV for spreadsheet users who want to do their own analysis or archive outside the DB.

---

## Architecture — DDD & Clean Architecture improvements

Findings from a by-the-book audit. Ordered by severity.

### Critical — Domain model deficiencies

#### C1. Rich `Transaction` entity with behavior

`Transaction` is an anemic interface. Categorization (`{ ...txn, categoryId }`) happens in the presentation layer — domain logic leaking outward.

- [ ] Convert `Transaction` from interface to class with private constructor
- [ ] Add `categorize(categoryId: CategoryId): Transaction` method
- [ ] Remove all `{ ...txn, categoryId }` spreads from presentation/application layers

#### C2. `MonthlyReport` → Domain Service

`MonthlyReport` has no identity and is never persisted. It's a computation result, not an entity.

- [ ] Extract `compute()` into a `ComputeMonthlyReport` domain service
- [ ] Make `MonthlyReport` a plain read-model DTO (no static factory)

#### C3. Strongly typed aggregate references

`categoryId?: string`, `id: string`, `source: string` are weakly typed.

- [ ] Create `CategoryId` value object
- [ ] Create `TransactionId` value object
- [ ] Create `TransactionSource` value object (or const enum: `"csv" | "mock"`)
- [ ] Replace raw strings throughout the codebase

### High — Layer boundary violations

#### H1. Remove infrastructure instantiation from presentation

`import-command.ts` does `new CsvTransactionParser(mapping)` directly.

- [ ] Inject a `parserFactory: (mapping: CsvColumnMapping) => TransactionParser` at the composition root
- [ ] Remove `CsvTransactionParser` import from `import-command.ts`

#### H2. All presentation → gateway calls must go through use cases

`transactions-command.ts` and `rules-command.ts` call repositories directly.

- [ ] Create `ListTransactions` use case
- [ ] Create `CategorizeTransactions` use case
- [ ] Create `ListRules` use case
- [ ] Create `AddRule` use case
- [ ] Create `RemoveRule` use case
- [ ] Update commands to call use cases instead of repositories

#### H3. Remove duplicate validation in `rules-command.ts`

Regex validation happens in the command AND in `createCategoryRule()`.

- [ ] Remove the `new RegExp()` try/catch from the command
- [ ] Catch `DomainError` from `createCategoryRule()` instead

#### H4. `openDatabase()` should return interfaces, not concrete types

Exposes `SqliteTransactionRepository`, `SqliteCategoryRuleRepository`, and `Database.Database` to the composition root.

- [ ] Return `TransactionRepository` and `CategoryRuleRepository` (interfaces)
- [ ] Stop exposing `db: Database.Database` — manage lifecycle internally or via a `close()` method

### Medium — Misplaced responsibilities

#### M1. Move `mock-dataset.ts` out of the domain layer

Test/demo data generators are not domain logic.

- [ ] Move to `infrastructure/mock/` or `tests/helpers/`
- [ ] Update `SeedMockData` import path

#### M2. Inject bank prefixes into `extractPattern`

`FRENCH_BANK_PREFIXES` is hardcoded in a domain service — locale-specific data in the domain.

- [ ] Change `extractPattern(label, bankPrefixes)` to accept prefixes as parameter
- [ ] Move `FRENCH_BANK_PREFIXES` to locale config alongside `fr.ts` rules
- [ ] Inject prefixes from the composition root

#### M3. Move `default-category-rules/fr.ts` to infrastructure

French merchant regex patterns are locale-specific configuration, not universal domain knowledge.

- [ ] Move to `infrastructure/config/category-rules/fr.ts`
- [ ] Update barrel export and composition root

#### M4. Rename `InvalidCsvData` to `InvalidImportData`

CSV is an infrastructure format. The domain error hierarchy should be format-agnostic.

- [ ] Rename to `InvalidImportData` (or move to infrastructure error)
- [ ] Update all references

#### M5. Remove currency symbol from `Money.format()`

`Money.format()` hardcodes `€` — mixing domain and presentation.

- [ ] Remove `format()` from `Money` (or make it return raw number string)
- [ ] Move formatted rendering (`€` symbol, locale) to the presentation layer renderers

### Low — Design smells

#### L1. Remove pass-through `ImportTransactions.parse()`

`parse(parser, filePath) { return parser.parse(filePath); }` adds zero value.

- [ ] Either make `ImportTransactions.execute()` a full orchestrator (parse + split + save)
- [ ] Or remove the method and let the command call the parser directly

#### L2. Add Unit of Work for multi-repository operations

`importTransactions.save()` and `learnCategoryRules.learn()` are separate DB operations with no shared transaction boundary.

- [ ] Introduce a `UnitOfWork` abstraction wrapping SQLite transactions
- [ ] Use it in the import flow to ensure atomicity

#### L3. Inject category→group mapping instead of compile-time constant

`CATEGORY_GROUP_MAP` in `monthly-report.ts` is derived from `DEFAULT_CATEGORIES` at module load time.

- [ ] Pass the mapping as a parameter to `MonthlyReport.compute()` (or the domain service)
- [ ] Prepare for future user-defined categories

#### L4. Decouple `CsvColumnMapping` from presentation

The presentation layer constructs `CsvColumnMapping` (infrastructure type) directly.

- [ ] Move the column mapping prompt result to a presentation-layer DTO
- [ ] Let the composition root or factory convert it to `CsvColumnMapping`
