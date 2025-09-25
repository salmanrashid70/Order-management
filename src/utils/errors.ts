/**
 * Base custom error class
 */
export abstract class CustomError extends Error {
  abstract statusCode: number;
  abstract errorCode: string;
  errors?: { message: string; field?: string }[];

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, CustomError.prototype);
  }

  abstract serializeErrors(): { message: string; field?: string }[];
}

/**
 * Validation error for Zod validation failures
 */
export class ValidationError extends CustomError {
  statusCode = 400;
  errorCode = 'VALIDATION_ERROR';

  constructor(public errors: { message: string; field?: string }[]) {
    super('Validation failed');
    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  serializeErrors() {
    return this.errors;
  }
}

/**
 * Resource not found error
 */
export class NotFoundError extends CustomError {
  statusCode = 404;
  errorCode = 'NOT_FOUND';

  constructor(public resource: string, public id?: string) {
    super(`${resource}${id ? ` with id ${id}` : ''} not found`);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }

  serializeErrors() {
    return [{ message: this.message }];
  }
}

/**
 * Business rule violation error
 */
export class BusinessError extends CustomError {
  statusCode = 422;
  errorCode = 'BUSINESS_ERROR';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, BusinessError.prototype);
  }

  serializeErrors() {
    return [{ message: this.message }];
  }
}

/**
 * Payment processing error
 */
export class PaymentError extends CustomError {
  statusCode = 402;
  errorCode = 'PAYMENT_ERROR';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, PaymentError.prototype);
  }

  serializeErrors() {
    return [{ message: this.message }];
  }
}

/**
 * Database operation error
 */
export class DatabaseError extends CustomError {
  statusCode = 500;
  errorCode = 'DATABASE_ERROR';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }

  serializeErrors() {
    return [{ message: this.message }];
  }
}