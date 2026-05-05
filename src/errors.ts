import type { JsonValue } from "./types";

export class MultinexError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "MultinexError";
  }
}

export class MultinexConfigurationError extends MultinexError {
  constructor(message: string) {
    super(message);
    this.name = "MultinexConfigurationError";
  }
}

export class MultinexValidationError extends MultinexError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "MultinexValidationError";
  }
}

export class MultinexAPIError extends MultinexError {
  public readonly statusCode: number;
  public readonly responseData?: JsonValue;

  constructor(message: string, statusCode: number, responseData?: JsonValue) {
    super(message);
    this.name = "MultinexAPIError";
    this.statusCode = statusCode;
    this.responseData = responseData;
  }
}
