import { Container, ConsoleLogger } from '@saas-packages/core';
import { QueueManager, QueueServiceProvider } from '@saas-packages/queue-manager';
import { DatabaseManager, DatabaseServiceProvider } from '@saas-packages/database-manager';

// Example job processor
class EmailJobProcessor {
  async process(job: any) {
    console.log(`Processing email job: ${job.id}`);
    console.log('Job data:', job.data);
    
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      data: { messageId: `email_${job.id}` }
    };
  }
}

async function main() {
  // Create the dependency injection container
  const container = new Container();
  
  // Create logger
  const logger = new ConsoleLogger();
  
  // Configure queue manager
  const queueConfig = {
    redis: {
      host: 'localhost',
      port: 6379,
      password: undefined,
      db: 0
    },
    prefix: 'myapp',
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential' as const,
        delay: 2000
      }
    }
  };
  
  // Configure database manager
  const databaseConfig = {
    url: 'postgresql://username:password@localhost:5432/myapp',
    logQueries: true,
    logErrors: true
  };
  
  // Register service providers
  const queueServiceProvider = new QueueServiceProvider(queueConfig, logger);
  const databaseServiceProvider = new DatabaseServiceProvider(databaseConfig, logger);
  
  queueServiceProvider.register(container);
  databaseServiceProvider.register(container);
  
  try {
    // Get instances from container
    const queueManager = container.resolve<QueueManager>('queue.manager');
    const databaseManager = container.resolve<DatabaseManager>('database.manager');
    
    // Connect to database
    await databaseManager.connect();
    logger.info('Database connected');
    
    // Create a queue
    const emailQueue = queueManager.createQueue('emails');
    
    // Create a worker
    const emailWorker = queueManager.createWorker('emails', new EmailJobProcessor());
    
    // Add a job
    const job = await queueManager.addJob('emails', {
      to: 'user@example.com',
      subject: 'Welcome!',
      body: 'Welcome to our platform!'
    });
    
    logger.info(`Job added with ID: ${job.id}`);
    
    // Wait a bit for the job to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Clean up
    await queueManager.closeAll();
    await databaseManager.disconnect();
    
    logger.info('Application shutdown complete');
    
  } catch (error) {
    logger.error('Error in main:', error);
    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
} 