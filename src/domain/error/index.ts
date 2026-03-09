export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class InvalidMonth extends DomainError {
  constructor(input: string) {
    super(`Invalid month format: "${input}". Expected YYYY-MM.`);
  }
}

export class BudgetAlreadyExists extends DomainError {
  constructor(month: string) {
    super(`Budget already exists for ${month}.`);
  }
}

export class UnknownBankAdapter extends DomainError {
  constructor(bankName: string) {
    super(`Unknown bank adapter: "${bankName}".`);
  }
}

export class InvalidCsvData extends DomainError {
  constructor(detail: string) {
    super(`Invalid CSV data: ${detail}`);
  }
}
