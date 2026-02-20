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

  const pool = new Pool({
    connectionString: process.env.APP_DATABASE_URL,
    // Connection pool settings optimized for Next.js
    max: parseInt(process.env.DATABASE_POOL_MAX || '10', 10), // Maximum pool size
    min: parseInt(process.env.DATABASE_POOL_MIN || '2', 10), // Minimum pool size
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 5000, // Timeout after 5 seconds if connection cannot be established
    // SSL configuration (if needed)
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
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
