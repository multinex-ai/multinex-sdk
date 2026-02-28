export class MultinexError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MultinexError';
  }
}

export class MultinexAPIError extends MultinexError {
  public statusCode: number;
  public responseData: any;

  constructor(message: string, statusCode: number, responseData?: any) {
    super(message);
    this.name = 'MultinexAPIError';
    this.statusCode = statusCode;
    this.responseData = responseData;
  }
}
