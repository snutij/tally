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

export class InvalidImportData extends DomainError {
  constructor(detail: string) {
    super(`Invalid import data: ${detail}`);
  }
}

export class InvalidMonthRange extends DomainError {
  constructor(start: string, end: string) {
    super(`Invalid month range: start "${start}" must be before or equal to end "${end}".`);
  }
}
