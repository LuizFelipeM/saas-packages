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

## Creating Workers

Workers are responsible for processing jobs from queues. Here's how to create and configure workers:

### Basic Worker Creation

```typescript
import { JobProcessor, JobData, JobResult } from '@saas-packages/queue-manager';
import { Job } from 'bullmq';

// Define your job processor
class EmailJobProcessor implements JobProcessor<JobData> {
  async process(job: Job<JobData>): Promise<JobResult> {
    console.log(`Processing email job: ${job.id}`);
    console.log('Job data:', job.data);
    
    try {
      // Your job processing logic here
      await this.sendEmail(job.data);
      
      return {
        success: true,
        data: { messageId: `email_${job.id}` }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  private async sendEmail(data: JobData) {
    // Email sending logic
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Create a queue first
const emailQueue = queueManager.createQueue('emails');

// Create a worker for the queue
const emailWorker = queueManager.createWorker('emails', new EmailJobProcessor());
```

### Worker with Custom Options

```typescript
// Create a worker with custom configuration
const emailWorker = queueManager.createWorker('emails', new EmailJobProcessor(), {
  concurrency: 5, // Process 5 jobs simultaneously
  autorun: true,   // Start processing immediately
  stalledInterval: 30000, // Check for stalled jobs every 30 seconds
  maxStalledCount: 1,     // Max number of times a job can be stalled
});
```

### Typed Job Data

For better type safety, you can define specific job data types. The `createWorker` method now provides improved generic type support:

```typescript
interface EmailJobData {
  to: string;
  subject: string;
  body: string;
  template?: string;
}

class TypedEmailJobProcessor implements JobProcessor<EmailJobData> {
  async process(job: Job<EmailJobData>): Promise<JobResult> {
    const { to, subject, body, template } = job.data;
    
    try {
      await this.sendEmail({ to, subject, body, template });
      
      return {
        success: true,
        data: { messageId: `email_${job.id}`, recipient: to }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  private async sendEmail(data: EmailJobData) {
    // Email sending logic
  }
}

// Create worker with typed data - improved type inference
const emailWorker = queueManager.createWorker('emails', new TypedEmailJobProcessor());
```

The `createWorker` method signature has been enhanced to provide better type safety:

```typescript
createWorker<P extends JobProcessor<T>, T = unknown>(
  queueName: string,
  processor: P,
  options?: Partial<Omit<WorkerOptions, 'connection'>>
): Worker<T>
```

This ensures that:
- The processor type is properly constrained to `JobProcessor<T>`
- The worker returns the correct generic type `Worker<T>`
- The options parameter excludes the `connection` property (handled internally)

### Worker Event Handling

Workers emit events that you can listen to:

```typescript
const emailWorker = queueManager.createWorker('emails', new EmailJobProcessor());

// Listen to worker events
emailWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});

emailWorker.on('error', (err) => {
  console.error('Worker error:', err);
});

emailWorker.on('stalled', (jobId) => {
  console.warn(`Job ${jobId} stalled`);
});
```

### Moving Jobs to Delay

You can move jobs to a delay queue for later processing by returning a `moveToDelay` option in your job processor:

```typescript
class RetryJobProcessor implements JobProcessor<JobData> {
  async process(job: Job<JobData>): Promise<JobResult> {
    try {
      // Your processing logic
      const result = await this.processJob(job.data);
      
      // If processing fails, move to delay for retry
      if (!result.success) {
        return {
          success: false,
          error: result.error,
          moveToDelay: {
            delay: 60000, // 1 minute delay
            queueName: 'retry-queue' // Optional: specific queue, defaults to current queue
          }
        };
      }
      
      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        moveToDelay: {
          delay: 30000 // 30 seconds delay
        }
      };
    }
  }
  
  private async processJob(data: JobData) {
    // Your job processing logic
  }
}

// Create queues
const mainQueue = queueManager.createQueue('main');
const retryQueue = queueManager.createQueue('retry-queue');

// Create worker that can move jobs to delay
const mainWorker = queueManager.createWorker('main', new RetryJobProcessor());
```

#### Move to Delay with Exponential Backoff

```typescript
class ExponentialBackoffProcessor implements JobProcessor<JobData> {
  async process(job: Job<JobData>): Promise<JobResult> {
    const attemptCount = job.attemptsMade || 0;
    const maxAttempts = 5;
    
    try {
      // Your processing logic
      await this.processJob(job.data);
      
      return {
        success: true,
        data: { processed: true }
      };
    } catch (error) {
      if (attemptCount < maxAttempts) {
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s
        const delay = Math.pow(2, attemptCount) * 1000;
        
        return {
          success: false,
          error: error.message,
          moveToDelay: {
            delay,
            queueName: 'retry-queue'
          }
        };
      }
      
      // Max attempts reached, fail permanently
      return {
        success: false,
        error: `Failed after ${maxAttempts} attempts: ${error.message}`
      };
    }
  }
  
  private async processJob(data: JobData) {
    // Your job processing logic
  }
}
```

#### Conditional Move to Delay

```typescript
class ConditionalDelayProcessor implements JobProcessor<JobData> {
  async process(job: Job<JobData>): Promise<JobResult> {
    const { priority, data } = job.data;
    
    try {
      // Process based on priority
      if (priority === 'high') {
        await this.processHighPriority(data);
      } else if (priority === 'low') {
        // Move low priority jobs to delay queue
        return {
          success: true,
          data: { queued: true },
          moveToDelay: {
            delay: 300000, // 5 minutes
            queueName: 'low-priority'
          }
        };
      }
      
      return {
        success: true,
        data: { processed: true }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  private async processHighPriority(data: any) {
    // High priority processing logic
  }
}
```

### Multiple Workers for the Same Queue

You can create multiple workers for the same queue to handle high load:

```typescript
// Create multiple workers for the same queue
const worker1 = queueManager.createWorker('emails', new EmailJobProcessor(), { concurrency: 3 });
const worker2 = queueManager.createWorker('emails', new EmailJobProcessor(), { concurrency: 3 });
const worker3 = queueManager.createWorker('emails', new EmailJobProcessor(), { concurrency: 3 });
```

### Worker Lifecycle Management

```typescript
// Get all workers
const allWorkers = queueManager.getAllWorkers();

// Get a specific worker
const emailWorker = queueManager.getWorker('emails');

// Close a specific worker
await queueManager.closeWorker('emails');

// Close all workers
await queueManager.closeAll();
```

### Best Practices

1. **Error Handling**: Always implement proper error handling in your job processors
2. **Idempotency**: Make your jobs idempotent so they can be safely retried
3. **Resource Management**: Close workers when shutting down your application
4. **Monitoring**: Listen to worker events for monitoring and debugging
5. **Concurrency**: Set appropriate concurrency levels based on your system resources
6. **Job Data Validation**: Validate job data before processing
7. **Move to Delay**: Use `moveToDelay` for implementing retry logic with exponential backoff
8. **Queue Separation**: Use separate queues for different priority levels or retry strategies

### Complete Example

```typescript
import { QueueManager, QueueServiceProvider, JobProcessor, JobData, JobResult } from '@saas-packages/queue-manager';
import { Container, ConsoleLogger } from '@saas-packages/core';
import { Job } from 'bullmq';

// Job processor
class EmailJobProcessor implements JobProcessor<JobData> {
  async process(job: Job<JobData>): Promise<JobResult> {
    console.log(`Processing email job: ${job.id}`);
    
    try {
      // Simulate email sending
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        data: { messageId: `email_${job.id}` }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

async function main() {
  const container = new Container();
  const logger = new ConsoleLogger();
  
  const queueConfig = {
    redis: { host: 'localhost', port: 6379 },
    prefix: 'myapp',
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential' as const, delay: 2000 }
    }
  };
  
  const provider = new QueueServiceProvider(queueConfig, logger);
  provider.register(container);
  
  const queueManager = container.resolve<QueueManager>('queue.manager');
  
  // Create queue and worker
  const emailQueue = queueManager.createQueue('emails');
  const emailWorker = queueManager.createWorker('emails', new EmailJobProcessor());
  
  // Add a job
  const job = await queueManager.addJob('emails', {
    to: 'user@example.com',
    subject: 'Welcome!',
    body: 'Welcome to our platform!'
  });
  
  logger.info(`Job added with ID: ${job.id}`);
  
  // Wait for processing
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Clean up
  await queueManager.closeAll();
}

main().catch(console.error);
```