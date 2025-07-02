# @saas-packages/queue-manager

Queue management for SaaS applications using BullMQ.

## Installation

```bash
npm install @saas-packages/queue-manager
```

## Usage

```typescript
import { QueueManager, QueueServiceProvider } from '@saas-packages/queue-manager';
import { container } from '@saas-packages/core';

const queueConfig = {
  redis: { host: 'localhost', port: 6379 },
  prefix: 'myapp'
};

const provider = new QueueServiceProvider(queueConfig);
provider.register(container);

const queueManager = container.resolve('queue.manager');
```