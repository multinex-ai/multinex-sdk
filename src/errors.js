"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultinexAPIError = exports.MultinexError = void 0;
class MultinexError extends Error {
    constructor(message) {
        super(message);
        this.name = 'MultinexError';
    }
}
exports.MultinexError = MultinexError;
class MultinexAPIError extends MultinexError {
    statusCode;
    responseData;
    constructor(message, statusCode, responseData) {
        super(message);
        this.name = 'MultinexAPIError';
        this.statusCode = statusCode;
        this.responseData = responseData;
    }
}
exports.MultinexAPIError = MultinexAPIError;
