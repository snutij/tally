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

export class InvalidCsvData extends DomainError {
  constructor(detail: string) {
    super(`Invalid CSV data: ${detail}`);
  }
}
