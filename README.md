# SaaS Packages

A monorepo containing personal Node.js TypeScript libraries for SaaS applications, built with dependency injection using Verfify.

## Packages

### @saas-packages/core
Core utilities and dependency injection container for all SaaS packages.

**Features:**
- Dependency injection container using Verfify
- Common interfaces and types
- Service provider pattern
- Logger interface and implementation

### @saas-packages/queue-manager
Queue management for SaaS applications using BullMQ and Redis.

**Features:**
- BullMQ integration for job queues
- Redis connection management
- Job processing with retry logic
- Dependency injection ready
- TypeScript support

### @saas-packages/database-manager
Database management for SaaS applications using Prisma ORM.

**Features:**
- Prisma client management
- Connection pooling
- Transaction support
- Health checks
- Migration management
- Dependency injection ready

## Installation

This repository uses pnpm as the package manager. Make sure you have pnpm installed:

```bash
npm install -g pnpm
```

Install dependencies:

```bash
pnpm install
```

## Development

### Building all packages

```bash
pnpm build
```

### Development mode (watch)

```bash
pnpm dev
```

### Type checking

```bash
pnpm type-check
```

### Linting

```bash
pnpm lint
```

### Cleaning

```bash
pnpm clean
```

## Usage

### Basic Setup

```typescript
import { Container, ConsoleLogger } from '@saas-packages/core';
import { QueueManager, QueueServiceProvider } from '@saas-packages/queue-manager';
import { DatabaseManager, DatabaseServiceProvider } from '@saas-packages/database-manager';

// Create container
const container = new Container();
const logger = new ConsoleLogger();

// Configure services
const queueConfig = {
  redis: {
    host: 'localhost',
    port: 6379,
    password: undefined,
    db: 0
  },
  prefix: 'myapp'
};

const databaseConfig = {
  url: 'postgresql://username:password@localhost:5432/myapp',
  logQueries: true
};

// Register service providers
const queueServiceProvider = new QueueServiceProvider(queueConfig, logger);
const databaseServiceProvider = new DatabaseServiceProvider(databaseConfig, logger);

queueServiceProvider.register(container);
databaseServiceProvider.register(container);

// Use services
const queueManager = container.resolve<QueueManager>('queue.manager');
const databaseManager = container.resolve<DatabaseManager>('database.manager');
```

### Queue Manager Example

```typescript
import { JobProcessor, JobData, JobResult } from '@saas-packages/queue-manager';
import { Job } from 'bullmq';

// Create a job processor with proper typing
class EmailJobProcessor implements JobProcessor<JobData> {
  async process(job: Job<JobData>): Promise<JobResult> {
    console.log(`Processing email job: ${job.id}`);
    // Process the job...
    return { success: true, data: { processed: true } };
  }
}

// Create queue and worker with improved type safety
const emailQueue = queueManager.createQueue('emails');
const emailWorker = queueManager.createWorker('emails', new EmailJobProcessor());

// Add a job
const job = await queueManager.addJob('emails', {
  to: 'user@example.com',
  subject: 'Welcome!',
  body: 'Welcome to our platform!'
});
```

### Database Manager Example

```typescript
// Connect to database
await databaseManager.connect();

// Get Prisma client
const prisma = databaseManager.getClient();

// Use in transaction
const result = await databaseManager.executeTransaction(async (prisma) => {
  const user = await prisma.user.create({
    data: {
      email: 'user@example.com',
      name: 'John Doe'
    }
  });
  
  return user;
});

// Health check
const isHealthy = await databaseManager.healthCheck();
```

## Configuration

### Environment Variables

Create a `.env` file in your project root:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/myapp"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Logging
LOG_QUERIES=true
LOG_ERRORS=true
```

### Database Setup

1. Install Prisma CLI:
```bash
pnpm add -D prisma
```

2. Generate Prisma client:
```bash
cd packages/database-manager
pnpm db:generate
```

3. Run migrations:
```bash
pnpm db:migrate
```

## Project Structure

```
saas-packages/
├── packages/
│   ├── core/                 # Core utilities and DI container
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── queue-manager/        # BullMQ queue management
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── database-manager/     # Prisma database management
│       ├── src/
│       ├── prisma/
│       ├── package.json
│       └── tsconfig.json
├── examples/                 # Usage examples
├── package.json             # Root package.json
├── pnpm-workspace.yaml      # pnpm workspace config
├── tsconfig.json           # Root TypeScript config
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.