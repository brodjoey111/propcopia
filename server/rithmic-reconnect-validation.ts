export interface RithmicReconnectValidation {
  validatedAt: string;
  source: "saved_connect";
}

export class RithmicReconnectValidationStore {
  private validations = new Map<string, RithmicReconnectValidation>();

  markValidated(accountId: string, validation: RithmicReconnectValidation): void {
    this.validations.set(accountId, validation);
  }

  clear(accountId: string): void {
    this.validations.delete(accountId);
  }

  get(accountId: string): RithmicReconnectValidation | undefined {
    return this.validations.get(accountId);
  }
}
