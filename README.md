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
- BullMQ integration with full TypeScript support
- Flexible Redis connection management (single instance, cluster, or custom Redis instance)
- Event-driven architecture with custom event emitters
- Advanced job processing with delay queue support
- Exponential backoff and retry mechanisms
- Worker lifecycle management
- Type-safe job processors with generic support
- Dependency injection ready with service provider pattern
- Comprehensive error handling and logging
- Job result handling with success/failure states
- Move jobs to delay queues for later processing

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
  connection: {
    host: 'localhost',
    port: 6379,
    password: undefined,
    db: 0
  },
  prefix: 'myapp',
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 2000 }
  }
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

// Create a job processor with proper typing and delay support
class EmailJobProcessor implements JobProcessor<JobData> {
  async process(job: Job<JobData>): Promise<JobResult> {
    console.log(`Processing email job: ${job.id}`);
    
    try {
      // Simulate email processing
      await this.sendEmail(job.data);
      
      return { 
        success: true, 
        data: { messageId: `email_${job.id}` } 
      };
    } catch (error) {
      // Move to delay queue for retry with exponential backoff
      return {
        success: false,
        error: error.message,
        delay: 30000 // 30 seconds delay
      };
    }
  }
  
  private async sendEmail(data: JobData) {
    // Email sending logic
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Create queue and worker with improved type safety
const emailQueue = queueManager.createQueue('emails');
const emailWorker = queueManager.createWorker('emails', new EmailJobProcessor(), {
  concurrency: 5, // Process 5 jobs simultaneously
  autorun: true
});

// Subscribe to queue events
queueManager.subscribe('queueCreated', (queue) => {
  console.log(`Queue created: ${queue.name}`);
});

queueManager.subscribe('workerCreated', (worker) => {
  console.log(`Worker created: ${worker.name}`);
});

// Add a job
const job = await queueManager.addJob('emails', {
  to: 'user@example.com',
  subject: 'Welcome!',
  body: 'Welcome to our platform!'
});

console.log(`Job added with ID: ${job.id}`);
```

### Advanced Queue Manager Features

The queue-manager package includes several advanced features for production-ready applications:

#### Event-Driven Architecture
```typescript
// Subscribe to lifecycle events
queueManager.subscribe('queueCreated', (queue) => {
  logger.info(`Queue created: ${queue.name}`);
});

queueManager.subscribe('workerRemoved', (worker) => {
  logger.info(`Worker removed: ${worker.name}`);
});

queueManager.subscribe('queueManagerClosed', () => {
  logger.info('All queues and workers closed');
});
```

#### Delay Queue Support
```typescript
class RetryJobProcessor implements JobProcessor<JobData> {
  async process(job: Job<JobData>): Promise<JobResult> {
    try {
      await this.processJob(job.data);
      return { success: true, data: { processed: true } };
    } catch (error) {
      // Move to delay queue for retry
      return {
        success: false,
        error: error.message,
        delay: 60000 // 1 minute delay
      };
    }
  }
}
```

#### Flexible Redis Configuration
```typescript
// Single Redis instance
const config1 = {
  connection: { host: 'localhost', port: 6379 },
  prefix: 'myapp'
};

// Redis cluster
const config2 = {
  connection: {
    nodes: [
      { host: 'redis-1', port: 6379 },
      { host: 'redis-2', port: 6379 }
    ]
  },
  prefix: 'myapp'
};

// Custom Redis instance
const redis = new Redis({ host: 'localhost', port: 6379 });
const config3 = {
  connection: redis,
  prefix: 'myapp'
};
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

# Redis (for queue-manager)
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
│   │   │   ├── queue-manager.ts
│   │   │   ├── queue-service-provider.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
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