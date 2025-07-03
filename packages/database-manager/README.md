# @saas-packages/database-manager

Database management for SaaS applications using Prisma.

## Installation

```bash
npm install @saas-packages/database-manager @prisma/client
```

**Note**: This package requires `@prisma/client` as a peer dependency. Make sure to install it in your application.

## Usage

This package expects you to provide your own PrismaClient instance from your application's schema.

### 1. Set up your Prisma schema in your application

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Your application models
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 2. Generate and use the PrismaClient

```typescript
import { PrismaClient } from '@prisma/client';
import { DatabaseManager, DatabaseServiceProvider } from '@saas-packages/database-manager';
import { container } from '@saas-packages/core';

// Create your PrismaClient instance
const prisma = new PrismaClient();

const dbConfig = {
  prismaClient: prisma,
  url: 'postgresql://user:pass@localhost:5432/db',
  logQueries: true,
  logErrors: true
};

const provider = new DatabaseServiceProvider(dbConfig);
provider.register(container);

const dbManager = container.resolve('database.manager');
await dbManager.connect();

// Use the database manager
const isHealthy = await dbManager.healthCheck();
console.log('Database health:', isHealthy);
```

## Configuration

The `DatabaseManagerConfig` interface requires:

- `prismaClient`: Your PrismaClient instance
- `url`: Database connection URL
- Optional logging flags: `logQueries`, `logErrors`, `logWarnings`, `logInfo`