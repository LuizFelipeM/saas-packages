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

### 2. Generate and use the PrismaClient with DatabaseManager

```typescript
import { PrismaClient } from '@prisma/client';
import { DatabaseManager, DatabaseServiceProvider } from '@saas-packages/database-manager';
import { container } from 'tsyringe';

// Create your PrismaClient instance
const prisma = new PrismaClient();

// Simplified configuration - only requires the PrismaClient
const dbConfig = {
  prismaClient: prisma
};

const provider = new DatabaseServiceProvider(dbConfig);
provider.register(container);

// Resolve and use the database manager
const dbManager = container.resolve('database.manager');
await dbManager.connect();

// Use the database manager
const health = await dbManager.healthCheck();
console.log('Database health:', health);

// Access the PrismaClient directly
const users = await dbManager.client.user.findMany();
```

### 3. Using transactions

```typescript
// Execute a transaction
const result = await dbManager.executeTransaction(async (prisma) => {
  const user = await prisma.user.create({
    data: {
      email: 'user@example.com',
      name: 'John Doe'
    }
  });
  
  const profile = await prisma.profile.create({
    data: {
      userId: user.id,
      bio: 'Hello world'
    }
  });
  
  return { user, profile };
});
```

### 4. Health checking

```typescript
const health = await dbManager.healthCheck();
if (health.status === 'healthy') {
  console.log(`Database is healthy. Latency: ${health.details.latency}ms`);
} else {
  console.error('Database is unhealthy:', health.error);
}
```

## Configuration

The `DatabaseManagerConfig` interface has been simplified and now only requires:

- `prismaClient`: Your PrismaClient instance

### Configuration Changes

The configuration has been streamlined to focus on the essential requirement - the PrismaClient instance. Previous configuration options like `url`, `logQueries`, `logErrors`, etc. have been removed in favor of:

1. **Dependency Injection**: The database manager now uses the core package's dependency injection system
2. **Logger Integration**: Logging is now handled through the optional logger parameter in the service provider
3. **Simplified Setup**: Only the PrismaClient instance is required in the configuration

### Service Provider Pattern

The `DatabaseServiceProvider` registers the following services in the dependency container:

- `database.config`: The database configuration
- `database.logger`: The logger instance (if provided)
- `database.manager`: The database manager singleton
- `DatabaseManager`: The database manager class for direct instantiation

## Integration with Queue Manager

When using both database and queue managers together:

```typescript
import { PrismaClient } from '@prisma/client';
import { DatabaseManager, DatabaseServiceProvider } from '@saas-packages/database-manager';
import { QueueManager, QueueServiceProvider } from '@saas-packages/queue-manager';
import { container, Logger } from '@saas-packages/core';
import Redis from 'ioredis';

// Create instances
const prisma = new PrismaClient();
const redis = new Redis();
const logger = new Logger({ level: 'info' });

// Database configuration
const dbConfig = {
  prismaClient: prisma
};

// Queue configuration
const queueConfig = {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
};

// Register both providers
const dbProvider = new DatabaseServiceProvider(dbConfig, logger);
const queueProvider = new QueueServiceProvider(queueConfig, logger);

dbProvider.register(container);
queueProvider.register(container);

// Use both managers
const dbManager = container.resolve('database.manager');
const queueManager = container.resolve('queue.manager');

await dbManager.connect();
```