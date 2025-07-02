# @saas-packages/database-manager

Database management for SaaS applications using Prisma.

## Installation

```bash
npm install @saas-packages/database-manager
```

## Usage

```typescript
import { DatabaseManager, DatabaseServiceProvider } from '@saas-packages/database-manager';
import { container } from '@saas-packages/core';

const dbConfig = {
  url: 'postgresql://user:pass@localhost:5432/db',
  logQueries: true
};

const provider = new DatabaseServiceProvider(dbConfig);
provider.register(container);

const dbManager = container.resolve('database.manager');
await dbManager.connect();
```