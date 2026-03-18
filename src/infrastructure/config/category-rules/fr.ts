import type { DefaultRuleEntry } from "./index.js";

// Common French bank label prefixes to strip before extracting the merchant name.
// Sorted longest-first so we match the most specific prefix at runtime.
export const FR_BANK_PREFIXES: string[] = [
  "PAIEMENT CB",
  "ACHAT CB",
  "PRLV SEPA",
  "VIR SEPA",
  "VIR RECU",
  "VIR EMIS",
  "RETRAIT DAB",
  "CARTE CB",
  "PRELEVEMENT",
  "RETRAIT",
  "CHEQUE",
  "FRAIS CB",
  "PRLV",
  "VIR",
].toSorted((prefixA, prefixB) => prefixB.length - prefixA.length);

// Rules are tried in array order — put more specific patterns BEFORE generic ones.
// e.g. "uber eats" before "uber", "amazon prime" before "amazon", "free mobile" before "free".
export const FR_DEFAULT_RULES: DefaultRuleEntry[] = [
  // ─── EATING OUT (w02) — before transport to catch "uber eats" first ─────────
  { categoryId: "w02", pattern: "\\buber\\s*eats\\b" },
  { categoryId: "w02", pattern: "\\bdeliveroo\\b" },
  { categoryId: "w02", pattern: "\\bjust\\s*eat\\b" },
  { categoryId: "w02", pattern: "\\bmcdo\\b|\\bmcdonald\\b|\\bmac\\s*do\\b" },
  { categoryId: "w02", pattern: "\\bburger\\s*king\\b" },
  { categoryId: "w02", pattern: "\\bkfc\\b" },
  { categoryId: "w02", pattern: "\\bsubway\\b" },
  { categoryId: "w02", pattern: "\\bdominos?\\b|\\bpizza\\s*hut\\b" },
  { categoryId: "w02", pattern: "\\bboulangerie\\b|\\bboulang\\b" },
  { categoryId: "w02", pattern: "\\brestaurant\\b|\\bresto\\b" },
  { categoryId: "w02", pattern: "\\btraiteur\\b" },
  { categoryId: "w02", pattern: "\\bstarbucks\\b" },
  { categoryId: "w02", pattern: "\\bcafeteria\\b" },

  // ─── GROCERIES (n02) ─────────────────────────────────────────────────────────
  { categoryId: "n02", pattern: "\\bcarrefour\\b" },
  { categoryId: "n02", pattern: "\\bleclerc\\b" },
  { categoryId: "n02", pattern: "\\bauchan\\b" },
  { categoryId: "n02", pattern: "\\blidl\\b" },
  { categoryId: "n02", pattern: "\\baldi\\b" },
  { categoryId: "n02", pattern: "\\bmonoprix\\b" },
  { categoryId: "n02", pattern: "\\bfranprix\\b" },
  { categoryId: "n02", pattern: "\\bintermarche\\b|\\binter\\s*marche\\b" },
  { categoryId: "n02", pattern: "\\bcasino\\b" },
  { categoryId: "n02", pattern: "\\bpicard\\b" },
  { categoryId: "n02", pattern: "\\bnaturalia\\b" },
  { categoryId: "n02", pattern: "\\bbiocoop\\b" },
  { categoryId: "n02", pattern: "\\bgrand\\s*frais\\b" },
  { categoryId: "n02", pattern: "\\bsuper\\s*u\\b|\\bmagasin\\s*u\\b|\\bhyper\\s*u\\b" },
  { categoryId: "n02", pattern: "\\bspar\\b" },
  { categoryId: "n02", pattern: "\\bnetto\\b" },
  { categoryId: "n02", pattern: "\\bcora\\b" },
  { categoryId: "n02", pattern: "\\bgeant\\s*casino\\b" },
  { categoryId: "n02", pattern: "\\bla\\s*vie\\s*claire\\b" },

  // ─── TRANSPORT (n08) ─────────────────────────────────────────────────────────
  { categoryId: "n08", pattern: "\\bsncf\\b|\\btgv\\b|\\bouigo\\b" },
  { categoryId: "n08", pattern: "\\bratp\\b|\\bnavigo\\b|\\btitre\\s*de\\s*transport\\b" },
  { categoryId: "n08", pattern: "\\buber\\b" }, // after uber eats
  { categoryId: "n08", pattern: "\\bbolt\\b" },
  { categoryId: "n08", pattern: "\\bheetch\\b" },
  { categoryId: "n08", pattern: "\\bblablacar\\b" },
  { categoryId: "n08", pattern: "\\bpeage\\b|\\bsanef\\b|\\baprr\\b|\\bcofiroute\\b" },
  {
    categoryId: "n08",
    pattern: "\\bparking\\b|\\bindigo\\b|\\beffia\\b|\\bsaemes\\b|\\bq\\s*park\\b",
  },
  { categoryId: "n08", pattern: "\\blime\\b|\\btier\\b|\\bdott\\b" },
  { categoryId: "n08", pattern: "\\bvelib\\b" },
  {
    categoryId: "n08",
    pattern: "\\bair\\s*france\\b|\\beasyjet\\b|\\bryanair\\b|\\bvueling\\b|\\btransavia\\b",
  },
  { categoryId: "n08", pattern: "\\bflixbus\\b|\\boutbus\\b" },

  // ─── FUEL (n07) ──────────────────────────────────────────────────────────────
  { categoryId: "n07", pattern: "\\bshell\\b" },
  { categoryId: "n07", pattern: "\\besso\\b" },
  { categoryId: "n07", pattern: "\\bavia\\b" },
  { categoryId: "n07", pattern: "\\bq8\\b" },
  { categoryId: "n07", pattern: "\\bstation\\s*(?:service|essence)\\b" },

  // ─── RENT (n01) ──────────────────────────────────────────────────────────────
  { categoryId: "n01", pattern: "\\bloyer\\b" },
  { categoryId: "n01", pattern: "\\bbailleur\\b" },

  // ─── HOUSEHOLD (n05) ─────────────────────────────────────────────────────────
  { categoryId: "n05", pattern: "\\bikea\\b" },
  { categoryId: "n05", pattern: "\\bleroy\\s*merlin\\b" },
  { categoryId: "n05", pattern: "\\bcastorama\\b" },
  { categoryId: "n05", pattern: "\\bbrico\\s*depot\\b|\\bbricodepot\\b" },
  { categoryId: "n05", pattern: "\\bmr\\s*bricolage\\b" },
  { categoryId: "n05", pattern: "\\bmaisons\\s*du\\s*monde\\b" },
  { categoryId: "n05", pattern: "\\balinea\\b" },
  { categoryId: "n05", pattern: "\\bconforama\\b" },

  // ─── INSURANCE (n06) ─────────────────────────────────────────────────────────
  {
    categoryId: "n06",
    pattern: "\\bassurance\\s*(?:habitation|logement|maison|auto|moto|scolaire)\\b",
  },
  {
    categoryId: "n06",
    pattern: "\\bmma\\b|\\baxa\\b|\\bmatmut\\b|\\bgmf\\b|\\bmacif\\b|\\bmaif\\b",
  },

  // ─── ELECTRICITY (n12) ───────────────────────────────────────────────────────
  { categoryId: "n12", pattern: "\\bedf\\b" },
  { categoryId: "n12", pattern: "\\bengie\\b" },
  { categoryId: "n12", pattern: "\\bekwateur\\b|\\bplanete\\s*oui\\b|\\bgreenyellow\\b" },

  // ─── GAS (n13) ───────────────────────────────────────────────────────────────
  { categoryId: "n13", pattern: "\\bgdf\\b|\\bgaz\\s*de\\s*france\\b" },

  // ─── WATER (n14) ─────────────────────────────────────────────────────────────
  { categoryId: "n14", pattern: "\\bveolia\\b" },
  { categoryId: "n14", pattern: "\\beau\\s*de\\s*paris\\b" },
  { categoryId: "n14", pattern: "\\bsuez\\b" },
  { categoryId: "n14", pattern: "\\bsaur\\b" },

  // ─── PHONE (n10) — more specific before generic ───────────────────────────────
  { categoryId: "n10", pattern: "\\bfree\\s*mobile\\b" },
  { categoryId: "n10", pattern: "\\bsosh\\b" },
  { categoryId: "n10", pattern: "\\bred\\s*by\\s*sfr\\b" },
  { categoryId: "n10", pattern: "\\bb\\s*&\\s*you\\b|\\bbyou\\b" },
  { categoryId: "n10", pattern: "\\bsfr\\b" },
  { categoryId: "n10", pattern: "\\borange\\b" },
  { categoryId: "n10", pattern: "\\bbouygues\\b" },

  // ─── INTERNET (n11) — "free" after "free mobile" ─────────────────────────────
  { categoryId: "n11", pattern: "\\bfree\\b" },
  { categoryId: "n11", pattern: "\\bovh\\b" },
  { categoryId: "n11", pattern: "\\biliad\\b" },

  // ─── SUBSCRIPTIONS (w06) — specific before generic ───────────────────────────
  { categoryId: "w06", pattern: "\\bamazon\\s*prime\\b|\\bamzn\\s*prime\\b" },
  { categoryId: "w06", pattern: "\\bnetflix\\b" },
  { categoryId: "w06", pattern: "\\bspotify\\b" },
  { categoryId: "w06", pattern: "\\bdeezer\\b" },
  { categoryId: "w06", pattern: "\\bdisney\\+|\\bdisneyplus\\b|\\bdisney\\s*plus\\b" },
  { categoryId: "w06", pattern: "\\bcanal\\+|\\bcanal\\s*plus\\b" },
  { categoryId: "w06", pattern: "\\bapple\\b" },
  { categoryId: "w06", pattern: "\\byoutube\\s*premium\\b" },
  { categoryId: "w06", pattern: "\\bmicrosoft\\s*365\\b|\\boffice\\s*365\\b" },
  { categoryId: "w06", pattern: "\\badobe\\b" },
  { categoryId: "w06", pattern: "\\bchatgpt\\b|\\bopenai\\b" },
  { categoryId: "w06", pattern: "\\bbasic\\s*fit\\b|\\bgymlib\\b" },
  { categoryId: "w06", pattern: "\\bplaystation\\s*plus\\b|\\bps\\s*plus\\b" },
  { categoryId: "w06", pattern: "\\bmolotov\\b|\\bsalto\\b" },

  // ─── SHOPPING (w01) — "amazon" after "amazon prime" ──────────────────────────
  { categoryId: "w01", pattern: "\\bamazon\\b" },
  { categoryId: "w01", pattern: "\\bcdiscount\\b" },
  { categoryId: "w01", pattern: "\\bfnac\\b" },
  { categoryId: "w01", pattern: "\\bdarty\\b" },
  { categoryId: "w01", pattern: "\\bboulanger\\b" },
  { categoryId: "w01", pattern: "\\bzara\\b" },
  { categoryId: "w01", pattern: "\\bh\\s*&\\s*m\\b|\\bhm\\b" },
  { categoryId: "w01", pattern: "\\bprimark\\b" },
  { categoryId: "w01", pattern: "\\bkiabi\\b" },
  { categoryId: "w01", pattern: "\\buniqlo\\b" },
  { categoryId: "w01", pattern: "\\bdecathlon\\b" },
  { categoryId: "w01", pattern: "\\bgifi\\b" },
  { categoryId: "w01", pattern: "\\baliexpress\\b" },
  { categoryId: "w01", pattern: "\\bshein\\b" },
  { categoryId: "w01", pattern: "\\btemu\\b" },
  { categoryId: "w01", pattern: "\\bvinted\\b" },
  { categoryId: "w01", pattern: "\\bleboncoin\\b" },
  { categoryId: "w01", pattern: "\\bgaleries\\s*lafayette\\b|\\bprintemps\\b" },
  { categoryId: "w01", pattern: "\\blacoste\\b|\\bnike\\b|\\badidas\\b|\\breebok\\b" },

  // ─── BEAUTY (w05) ────────────────────────────────────────────────────────────
  { categoryId: "w05", pattern: "\\bsephora\\b" },
  { categoryId: "w05", pattern: "\\bnocibe\\b" },
  { categoryId: "w05", pattern: "\\bmarionnaud\\b" },
  { categoryId: "w05", pattern: "\\bcoiffeur\\b|\\bcoiffure\\b" },

  // ─── HEALTH (n16) ────────────────────────────────────────────────────────────
  { categoryId: "n16", pattern: "\\bpharmacie\\b" },
  { categoryId: "n16", pattern: "\\bmedecin\\b|\\bdocteur\\b|\\bcabinet\\s*medical\\b" },
  { categoryId: "n16", pattern: "\\bdentiste\\b|\\bchirurgien\\s*dent\\b" },
  {
    categoryId: "n16",
    pattern: "\\bopticien\\b|\\boptique\\b|\\bkrys\\b|\\bafflelou\\b|\\batol\\b",
  },
  { categoryId: "n16", pattern: "\\bhopital\\b|\\bclinique\\b" },
  { categoryId: "n16", pattern: "\\blaboratoire\\b|\\blabo\\s*analyse\\b" },
  { categoryId: "n16", pattern: "\\bkinesitherapeute\\b|\\bkine\\b|\\bosteopathe\\b" },
  { categoryId: "n16", pattern: "\\bpsychologue\\b|\\bpsychiatre\\b" },

  // ─── ENTERTAINMENT (w03) ─────────────────────────────────────────────────────
  { categoryId: "w03", pattern: "\\bcinema\\b|\\bugc\\b|\\bpathe\\b|\\bgaumont\\b|\\bmk2\\b" },
  {
    categoryId: "w03",
    pattern: "\\btheatre\\b|\\bconcert\\b|\\bspectacle\\b|\\bzenith\\b|\\bolympia\\b",
  },
  {
    categoryId: "w03",
    pattern: "\\bsteam\\b|\\bplaystation\\b|\\bnintendo\\b|\\bepic\\s*games\\b|\\bxbox\\b",
  },
  { categoryId: "w03", pattern: "\\bmusee\\b|\\bexposition\\b" },
  {
    categoryId: "w03",
    pattern: "\\bfrance\\s*billet\\b|\\bticketmaster\\b|\\bfnac\\s*spectacles\\b",
  },

  // ─── TRAVEL (w04) ────────────────────────────────────────────────────────────
  { categoryId: "w04", pattern: "\\bhotel\\b|\\bhotels\\b" },
  { categoryId: "w04", pattern: "\\bairbnb\\b" },
  { categoryId: "w04", pattern: "\\bbooking\\b|\\babritel\\b|\\bhomeaway\\b" },
  {
    categoryId: "w04",
    pattern: "\\bclub\\s*med\\b|\\bcenter\\s*parcs\\b|\\bpierre\\s*et\\s*vacances\\b",
  },

  // ─── TAXES (n15) ─────────────────────────────────────────────────────────────
  { categoryId: "n15", pattern: "\\bdgfip\\b|\\btresor\\s*public\\b" },
  { categoryId: "n15", pattern: "\\bimpot\\b" },
  { categoryId: "n15", pattern: "\\btaxe\\s*fonciere\\b" },
  { categoryId: "n15", pattern: "\\btaxe\\s*(?:d.)?habitation\\b" },

  // ─── SAVINGS (i02) ───────────────────────────────────────────────────────────
  { categoryId: "i02", pattern: "\\blivret\\s*a\\b" },
  { categoryId: "i02", pattern: "\\bldd\\b|\\bldds\\b|\\blivret\\s*dev\\b" },
  { categoryId: "i02", pattern: "\\bpel\\b|\\bplan\\s*epargne\\s*logement\\b" },
  { categoryId: "i02", pattern: "\\bper\\b|\\bplan\\s*epargne\\s*retraite\\b" },

  // ─── STOCK MARKET (i03) ──────────────────────────────────────────────────────
  { categoryId: "i03", pattern: "\\bpea\\b|\\bplan\\s*epargne\\s*actions\\b" },
  { categoryId: "i03", pattern: "\\bbourse\\b" },

  // ─── LIFE INSURANCE (i04) ────────────────────────────────────────────────────
  { categoryId: "i04", pattern: "\\bassurance\\s*vie\\b" },

  // ─── MORTGAGE REPAYMENT (i01) ────────────────────────────────────────────────
  {
    categoryId: "i01",
    pattern: "\\bpret\\s*immo\\b|\\bcredit\\s*immo\\b|\\becheance\\s*(?:de\\s*)?pret\\b",
  },
  { categoryId: "i01", pattern: "\\bcredit\\s*habitat\\b|\\bpret\\s*habitat\\b" },

  // ─── SALARY (inc01) ──────────────────────────────────────────────────────────
  { categoryId: "inc01", pattern: "\\bsalaire\\b" },
  { categoryId: "inc01", pattern: "\\bpaie\\b" },
  { categoryId: "inc01", pattern: "\\bremuneration\\b" },
  { categoryId: "inc01", pattern: "\\bvir(?:ement)?\\s*salaire\\b" },

  // ─── ALLOWANCES & BENEFITS (inc03) ──────────────────────────────────────────
  { categoryId: "inc03", pattern: "\\bcaf\\b" },
  { categoryId: "inc03", pattern: "\\bapl\\b" },
  { categoryId: "inc03", pattern: "\\brsa\\b" },
  { categoryId: "inc03", pattern: "\\ballocation\\b" },
  { categoryId: "inc03", pattern: "\\bpole\\s*emploi\\b|\\bfrance\\s*travail\\b" },
  { categoryId: "inc03", pattern: "\\bretraite\\b" },

  // ─── REFUND (inc04) ──────────────────────────────────────────────────────────
  { categoryId: "inc04", pattern: "\\bremboursement\\b" },
  { categoryId: "inc04", pattern: "\\brbt\\b" },
  { categoryId: "inc04", pattern: "\\bcpam\\b|\\bameli\\b" },
];
