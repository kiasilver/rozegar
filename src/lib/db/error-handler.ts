/**
 * Database Error Handler for Prisma
 * Next.js 16.1.1 Best Practices
 * 
 * Provides standardized error handling for database operations
 */

import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

export interface DatabaseError {
  message: string;
  code?: string;
  statusCode: number;
  details?: unknown;
}

/**
 * Handle Prisma errors and convert to standardized format
 */
export function handlePrismaError(error: unknown): DatabaseError {
  // Prisma Client errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return {
          message: 'رکورد تکراری است',
          code: error.code,
          statusCode: 409,
          details: error.meta,
        };
      case 'P2025':
        return {
          message: 'رکورد پیدا نشد',
          code: error.code,
          statusCode: 404,
          details: error.meta,
        };
      case 'P2003':
        return {
          message: 'خطا در ارتباط با رکورد مرتبط',
          code: error.code,
          statusCode: 400,
          details: error.meta,
        };
      case 'P2014':
        return {
          message: 'خطا در ارتباط بین رکوردها',
          code: error.code,
          statusCode: 400,
          details: error.meta,
        };
      default:
        return {
          message: 'خطا در عملیات دیتابیس',
          code: error.code,
          statusCode: 500,
          details: error.meta,
        };
    }
  }

  // Prisma Validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      message: 'داده‌های ارسالی نامعتبر است',
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      details: error.message,
    };
  }

  // Prisma Initialization errors
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      message: 'خطا در اتصال به دیتابیس',
      code: 'INITIALIZATION_ERROR',
      statusCode: 503,
      details: error.message,
    };
  }

  // Prisma RPC errors
  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return {
      message: 'خطای داخلی دیتابیس',
      code: 'RUST_PANIC',
      statusCode: 500,
      details: error.message,
    };
  }

  // Generic Error
  if (error instanceof Error) {
    return {
      message: error.message || 'خطای ناشناخته',
      statusCode: 500,
      details: error.stack,
    };
  }

  // Unknown error
  return {
    message: 'خطای ناشناخته در دیتابیس',
    statusCode: 500,
    details: error,
  };
}

/**
 * Create NextResponse from database error
 */
export function createDatabaseErrorResponse(error: unknown): NextResponse {
  const dbError = handlePrismaError(error);
  
  return NextResponse.json(
    {
      error: dbError.message,
      code: dbError.code,
      ...(process.env.NODE_ENV === 'development' && { details: dbError.details }),
    },
    { status: dbError.statusCode }
  );
}

/**
 * Safe database operation wrapper
 * Automatically handles errors and returns appropriate responses
 */
export async function safeDbOperation<T>(
  operation: () => Promise<T>,
  errorHandler?: (error: unknown) => NextResponse
): Promise<T | NextResponse> {
  try {
    return await operation();
  } catch (error) {
    if (errorHandler) {
      return errorHandler(error);
    }
    return createDatabaseErrorResponse(error);
  }
}
