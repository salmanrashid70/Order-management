import { ZodError } from 'zod';
import { logger } from '../utils/logger';
import { MongoServerError } from 'mongodb';
import { Request, Response, NextFunction } from 'express';
import { CustomError, ValidationError } from '../utils/errors';

/**
 * Global error handling middleware
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('Unhandled error:', error);

    if (error instanceof CustomError) {
        res.status(error.statusCode).json({
            success: false,
            error: {
            code: error.errorCode,
            message: error.message,
            ...(error instanceof ValidationError ? { details: error.errors } : {})
            }
        });
        return;
    }


  // Handle Zod validation errors
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.errors || []
      }
    });
    return;
  }

  // Handle MongoDB duplicate key errors
  if (error instanceof MongoServerError && error.code === 11000) {
    res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_KEY',
        message: 'Resource already exists'
      }
    });
    return;
  }

  // Handle MongoDB cast errors (invalid ObjectId)
  if (error.name === 'CastError') {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: 'Invalid resource ID'
      }
    });
    return;
  }

  // Generic server error
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred'
    }
  });
};