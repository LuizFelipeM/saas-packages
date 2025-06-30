import { Queue, Worker, QueueOptions, WorkerOptions, ConnectionOptions, Job } from 'bullmq';
import Redis from 'ioredis';
import { injectable, inject } from '@saas-packages/core';
import {
  QueueManagerInterface,
  QueueManagerConfig,
  JobProcessor,
  JobData,
  QueueJobOptions,
} from './types';

@injectable()
export class QueueManager implements QueueManagerInterface {
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private redis: Redis;
  private logger: any;
  private config: QueueManagerConfig;

  constructor(
    @inject('queue.config') config: QueueManagerConfig,
    @inject('queue.logger') logger?: any
  ) {
    this.config = config;
    this.logger = logger || console;
    
    const connectionOptions: ConnectionOptions = {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password || '',
      db: config.redis.db || 0,
    };

    this.redis = new Redis(connectionOptions);
    this.logger.info('QueueManager initialized');
  }

  createQueue(name: string, options?: Partial<QueueOptions>): Queue {
    if (this.queues.has(name)) {
      this.logger.warn(`Queue ${name} already exists, returning existing queue`);
      return this.queues.get(name)!;
    }

    const queueOptions: QueueOptions = {
      connection: this.redis,
      prefix: this.config.prefix || 'bull',
      ...options,
    };

    const queue = new Queue(name, queueOptions);
    this.queues.set(name, queue);
    this.logger.info(`Queue ${name} created`);
    
    return queue;
  }

  createWorker(
    queueName: string,
    processor: JobProcessor,
    options?: Partial<WorkerOptions>
  ): Worker {
    if (this.workers.has(queueName)) {
      this.logger.warn(`Worker for queue ${queueName} already exists, returning existing worker`);
      return this.workers.get(queueName)!;
    }

    const workerOptions: WorkerOptions = {
      connection: this.redis,
      prefix: this.config.prefix || 'bull',
      ...options,
    };

    const worker = new Worker(queueName, processor.process.bind(processor), workerOptions);
    this.workers.set(queueName, worker);
    this.logger.info(`Worker for queue ${queueName} created`);
    
    return worker;
  }

  async addJob<T = JobData>(
    queueName: string,
    data: T,
    options?: QueueJobOptions
  ): Promise<Job<T>> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found. Create it first using createQueue()`);
    }

    const jobOptions = {
      ...this.config.defaultJobOptions,
      ...options,
    };

    const job = await queue.add(queueName, data, jobOptions);
    this.logger.info(`Job added to queue ${queueName} with ID ${job.id}`);
    
    return job;
  }

  getQueue(name: string): Queue | undefined {
    return this.queues.get(name);
  }

  getWorker(queueName: string): Worker | undefined {
    return this.workers.get(queueName);
  }

  async closeQueue(name: string): Promise<void> {
    const queue = this.queues.get(name);
    if (queue) {
      await queue.close();
      this.queues.delete(name);
      this.logger.info(`Queue ${name} closed`);
    }
  }

  async closeWorker(queueName: string): Promise<void> {
    const worker = this.workers.get(queueName);
    if (worker) {
      await worker.close();
      this.workers.delete(queueName);
      this.logger.info(`Worker for queue ${queueName} closed`);
    }
  }

  async closeAll(): Promise<void> {
    const queuePromises = Array.from(this.queues.keys()).map(name => this.closeQueue(name));
    const workerPromises = Array.from(this.workers.keys()).map(name => this.closeWorker(name));
    
    await Promise.all([...queuePromises, ...workerPromises]);
    await this.redis.quit();
    this.logger.info('All queues and workers closed');
  }
} 