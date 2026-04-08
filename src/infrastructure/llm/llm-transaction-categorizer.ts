import type {
  CategorizationOutput,
  CategorizedResult,
  TransactionCategorizer,
} from "../../application/gateway/transaction-categorizer.js";
import type { CategoryDto } from "../../application/dto/category-dto.js";
import type { LlmGateway } from "../../application/gateway/llm-gateway.js";
import type { TransactionDto } from "../../application/dto/transaction-dto.js";

const MAX_LABELS_PER_BATCH = 20;

// Typical label keywords per category — helps small models disambiguate
const CATEGORY_HINTS: Record<string, string> = {
  i01: "REMBOURSEMENT PRET, CREDIT IMMOBILIER",
  i02: "EPARGNE, LIVRET, ASSURANCE VIE, VIREMENT EPARGNE",
  i03: "BOURSE, ETF, TRADING, ACTIONS",
  i04: "ASSURANCE VIE, PREVOYANCE",
  inc01: "SALAIRE, SALARY, PAIE, VIREMENT EMPLOYEUR",
  inc02: "LOYER RECU, LOYER PERCU",
  inc03: "CAF, APL, RSA, ALLOCATIONS, PRIME, FREELANCE, HONORAIRES, PRESTATIONS",
  inc04: "REMBOURSEMENT, REFUND, AVOIR",
  n01: "LOYER, LOYER JANVIER, LOYER FEVRIER, LOYER MARS, BAIL, CHARGES LOCATIVES",
  n02: "CARREFOUR, LECLERC, MONOPRIX, LIDL, ALDI, INTERMARCHE, CASINO, FRANPRIX, PICARD, SUPERMARCHE",
  n03: "COLOC, PARTAGE, CAGNOTTE",
  n04: "CRECHE, BABYSITTER, NOURRICE, JOUETS",
  n05: "IKEA, LEROY MERLIN, CASTORAMA, BRICOMARCHE, CONFORAMA, BRICO, MAISON",
  n06: "ASSURANCE HABITATION, ASSURANCE AUTO, MUTUELLE",
  n07: "TOTAL ENERGIES, ESSO, SHELL, BP, CARBURANT, ESSENCE",
  n08: "SNCF, RATP, TAXI, BUS, METRO, UBER (seul), NAVIGO, TRANSILIEN",
  n09: "INTERET PRET, INTERET CREDIT",
  n10: "FREE MOBILE, ORANGE, SFR, BOUYGUES, FORFAIT",
  n11: "FREE INTERNET, ORANGE INTERNET, FIBRE, ADSL",
  n12: "EDF, ENGIE, ELECTRICITE",
  n13: "GAZ, PRIMAGAZ, BUTAGAZ",
  n14: "EAU, VEOLIA, SAUR",
  n15: "IMPOTS, TAXE, TRESOR PUBLIC",
  n16: "PHARMACIE, MEDECIN, DENTISTE, HOPITAL, SANTE, OPTICIEN",
  n17: "autres besoins essentiels non listés",
  w01: "AMAZON, ZARA, H ET M, DECATHLON, FNAC, BOULANGER, APPLE STORE, CDISCOUNT",
  w02: "RESTAURANT, BRASSERIE, PIZZERIA, MCDONALD, BURGER, KFC, KEBAB, SUSHI, DOME, TERRASSE, UBER EATS, DELIVEROO, JUST EAT",
  w03: "CINEMA, THEATRE, CONCERT, MUSEE, BILLETERIE",
  w04: "BOOKING, AIRBNB, HOTEL, RYANAIR, AIR FRANCE, EASYJET, SNCF LOISIRS, VOYAGE",
  w05: "SEPHORA, YVES ROCHER, COIFFEUR, SALON, BEAUTY",
  w06: "NETFLIX, SPOTIFY, CANAL, DISNEY, AMAZON PRIME, DEEZER, YOUTUBE PREMIUM, GYM, BASIC FIT, KEEP COOL, ABONNEMENT",
  w07: "CADEAU, ANNIVERSAIRE, OFFRIR",
  w08: "autres dépenses non essentielles non listées",
};

const SYSTEM_PROMPT = `You are a personal finance transaction categorizer for French bank statements.
Assign each transaction label to exactly one category ID from the provided list.
Rules:
- Labels containing SALAIRE, FREELANCE, HONORAIRES → INCOME group
- Labels containing EPARGNE, LIVRET, BOURSORAMA EPARGNE → INVESTMENTS group
- Labels containing LOYER (without RECU/PERCU) → n01 Rent
- UBER EATS, DELIVEROO, JUST EAT → w02 Eating out (food delivery)
- UBER alone (without EATS) → n08 Transport
- Supermarkets (CARREFOUR, MONOPRIX, LECLERC, LIDL) → n02 Groceries
- Streaming/gym subscriptions (NETFLIX, SPOTIFY, BASIC FIT) → w06 Subscriptions
- Online shopping and electronics (AMAZON, FNAC, BOULANGER) → w01 Shopping
- Restaurants and food venues → w02 Eating out
Respond with valid JSON only — no explanation, no markdown.

Examples:
Input: {"1":"SALAIRE MARS","2":"UBER EATS","3":"CARREFOUR","4":"EDF","5":"NETFLIX"}
Output: {"1":"inc01","2":"w02","3":"n02","4":"n12","5":"w06"}

Input: {"1":"LOYER JANVIER","2":"BOURSORAMA EPARGNE","3":"SNCF","4":"PHARMACIE","5":"RESTAURANT LE DOME"}
Output: {"1":"n01","2":"i02","3":"n08","4":"n16","5":"w02"}

Input: {"1":"FREE MOBILE","2":"BOOKING.COM","3":"AMAZON","4":"FREELANCE CLIENT ABC","5":"RETRAIT DAB"}
Output: {"1":"n10","2":"w04","3":"w01","4":"inc03","5":"w08"}`;

function buildUserPrompt(labels: string[], categories: CategoryDto[]): string {
  const categoryList = categories
    .map((cat) => {
      const hints = CATEGORY_HINTS[cat.id];
      return hints
        ? `- ${cat.id}: ${cat.name} (${cat.group}) — e.g. ${hints}`
        : `- ${cat.id}: ${cat.name} (${cat.group})`;
    })
    .join("\n");

  const labelsJson = JSON.stringify(
    Object.fromEntries(labels.map((label, idx) => [String(idx + 1), label])),
  );

  return `Categories:\n${categoryList}\n\nCategorize these transaction labels:\n${labelsJson}\n\nRespond with JSON mapping each number to a category ID.`;
}

const RESPONSE_SCHEMA = {
  additionalProperties: { type: "string" },
  type: "object",
};

export class LlmTransactionCategorizer implements TransactionCategorizer {
  private readonly llmGateway: LlmGateway;

  constructor(llmGateway: LlmGateway) {
    this.llmGateway = llmGateway;
  }

  async categorize(
    transactions: TransactionDto[],
    categories: CategoryDto[],
  ): Promise<CategorizationOutput> {
    if (transactions.length === 0) {
      return { invalidCount: 0, results: [] };
    }

    const validCategoryIds = new Set(categories.map((cat) => cat.id));

    // Deduplicate labels
    const uniqueLabels = [...new Set(transactions.map((txn) => txn.label))];

    // Chunk into batches of MAX_LABELS_PER_BATCH
    const batches: string[][] = [];
    for (let idx = 0; idx < uniqueLabels.length; idx += MAX_LABELS_PER_BATCH) {
      batches.push(uniqueLabels.slice(idx, idx + MAX_LABELS_PER_BATCH));
    }

    // Collect label → categoryId mappings from all batches
    const labelToCategory = new Map<string, string>();
    let invalidCount = 0;
    for (const batch of batches) {
      const response = await this.llmGateway.complete<Record<string, string>>(
        SYSTEM_PROMPT,
        buildUserPrompt(batch, categories),
        RESPONSE_SCHEMA,
      );
      for (const [key, categoryId] of Object.entries(response)) {
        const idx = Number.parseInt(key, 10) - 1;
        if (!Number.isNaN(idx) && idx >= 0 && idx < batch.length) {
          const label = batch[idx];
          if (validCategoryIds.has(categoryId)) {
            labelToCategory.set(label, categoryId);
          } else {
            invalidCount += 1;
          }
        }
      }
    }

    // Map back to transactions
    const results: CategorizedResult[] = [];
    for (const txn of transactions) {
      const categoryId = labelToCategory.get(txn.label);
      if (categoryId) {
        results.push({ categoryId, transactionId: txn.id });
      }
    }
    return { invalidCount, results };
  }
}
