export { DomainError } from "../domain/error/index.js";

export class ApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}
