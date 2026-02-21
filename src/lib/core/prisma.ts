/**
 * Prisma Client Singleton for Next.js 16.1.1
 * 
 * Best Practices:
 * - Singleton pattern prevents multiple instances during hot-reload
 * - Connection pooling optimized for PostgreSQL
 * - Proper error handling and logging
 * - Production-ready configuration
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Global type for Prisma singleton
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

// PostgreSQL Connection Pool Configuration
// Optimized for Next.js 16.1.1 serverless and edge environments
const createPool = (): Pool => {
  if (globalForPrisma.pgPool) {
    return globalForPrisma.pgPool;
  }

  const connectionString = process.env.APP_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('❌ [Prisma] DATABASE_URL or APP_DATABASE_URL must be set in environment variables');
  }

  // Log connection info (without password) for debugging
  if (process.env.NODE_ENV === 'development') {
    const maskedUrl = connectionString.replace(/:[^:@]+@/, ':****@');
    console.log(`🔌 [Prisma] Connecting to database: ${maskedUrl}`);
  }

  const pool = new Pool({
    connectionString,
    // Connection pool settings - محدودیت شدید برای جلوگیری از CPU بالا
    max: parseInt(process.env.DATABASE_POOL_MAX || '3', 10), // کاهش به 3
    min: parseInt(process.env.DATABASE_POOL_MIN || '0', 10), // کاهش به 0
    idleTimeoutMillis: 5000, // کاهش به 5 ثانیه
    connectionTimeoutMillis: 3000, // کاهش به 3 ثانیه
    // SSL configuration (if needed)
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    // اضافه کردن statement_timeout برای جلوگیری از query های بی‌نهایت
    statement_timeout: 3000, // 3 ثانیه timeout برای هر query
    // محدودیت query execution time
    query_timeout: 3000, // 3 ثانیه
  });

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('❌ [Prisma] Unexpected PostgreSQL pool error:', err);
  });

  // Store pool in global for reuse
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.pgPool = pool;
  }

  return pool;
};

// Create PostgreSQL adapter with optimized pool
const pool = createPool();
const adapter = new PrismaPg(pool);

// Prisma Client Configuration
// Prisma 7.2.0 requires adapter for PostgreSQL
const getPrismaClientOptions = (): {
  adapter: PrismaPg;
  log: Prisma.LogLevel[];
  errorFormat: 'pretty';
} => ({
  adapter,
  log: process.env.NODE_ENV === 'development' 
    ? (['error', 'warn'] as Prisma.LogLevel[])
    : (['error'] as Prisma.LogLevel[]),
  // Error formatting for better debugging
  errorFormat: 'pretty',
});

// Create Prisma Client instance (singleton pattern)
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(getPrismaClientOptions());

// Store in global for hot-reload prevention (development only)
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown handler
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
    await pool.end();
  });

  process.on('SIGINT', async () => {
    await prisma.$disconnect();
    await pool.end();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    await pool.end();
    process.exit(0);
  });
}

export default prisma;
