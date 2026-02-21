# Database Layer - Next.js 16.1.1 & Prisma 7.2.0

## Overview

This directory contains optimized database utilities and helpers for Next.js 16.1.1 and Prisma 7.2.0.

## Files

### `../prisma.ts`
- **Prisma Client Singleton**: Prevents multiple instances during hot-reload
- **Connection Pooling**: Optimized PostgreSQL connection pool
- **Error Handling**: Graceful shutdown handlers
- **Production Ready**: Proper logging and error management

### `error-handler.ts`
- **Standardized Error Handling**: Converts Prisma errors to user-friendly messages
- **Error Types**: Handles all Prisma error codes (P2002, P2025, etc.)
- **Safe Operations**: Wrapper functions for error-safe database operations

### `query-helpers.ts`
- **Caching**: React cache integration for query deduplication
- **Pagination**: Reusable pagination utilities
- **Select Fields**: Optimized field selection for performance
- **Transactions**: Helper for complex atomic operations

## Best Practices

### 1. Always use the singleton Prisma client
```typescript
import { prisma } from '@/lib/prisma';
// ✅ Correct
const users = await prisma.user.findMany();
```

### 2. Use error handlers
```typescript
import { safeDbOperation, createDatabaseErrorResponse } from '@/lib/db/error-handler';

export async function GET() {
  return safeDbOperation(async () => {
    const data = await prisma.blog.findMany();
    return NextResponse.json(data);
  });
}
```

### 3. Use transactions for complex operations
```typescript
import { withTransaction } from '@/lib/db/query-helpers';

await withTransaction(async (tx) => {
  await tx.blog.delete({ where: { id } });
  await tx.blogTranslation.deleteMany({ where: { blog_id: id } });
});
```

### 4. Optimize queries with select fields
```typescript
import { blogSelectFields } from '@/lib/db/query-helpers';

const blogs = await prisma.blog.findMany({
  select: blogSelectFields,
});
```

## Connection Pool Configuration

Environment variables (optional):
- `DATABASE_POOL_MAX`: Maximum pool size (default: 10)
- `DATABASE_POOL_MIN`: Minimum pool size (default: 2)
- `DATABASE_SSL`: Enable SSL (default: false)

## Performance Tips

1. **Use select instead of include** when possible
2. **Use pagination** for large datasets
3. **Cache frequently accessed data** with React cache
4. **Use transactions** for related operations
5. **Index frequently queried fields** in schema
