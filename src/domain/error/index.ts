export class InvalidMonth extends Error {
  constructor(input: string) {
    super(`Invalid month format: "${input}". Expected YYYY-MM.`);
    this.name = "InvalidMonth";
  }
}

export class BudgetAlreadyExists extends Error {
  constructor(month: string) {
    super(`Budget already exists for ${month}.`);
    this.name = "BudgetAlreadyExists";
  }
}

export class UnknownBankAdapter extends Error {
  constructor(bankName: string) {
    super(`Unknown bank adapter: "${bankName}".`);
    this.name = "UnknownBankAdapter";
  }
}
