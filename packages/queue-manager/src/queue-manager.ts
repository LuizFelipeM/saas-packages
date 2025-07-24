import {
  Queue,
  Worker,
  QueueOptions,
  WorkerOptions,
  Job,
  JobsOptions,
} from 'bullmq';
import Redis from 'ioredis';
import { injectable, inject, Logger } from '@saas-packages/core';
import {
  QueueManagerInterface,
  QueueManagerConfig,
  JobProcessor,
  JobData,
  QueueJobOptions,
  QueueManagerEvent,
  QueueManagerListener,
  JobResult,
} from './types';
import { EventEmitter } from 'events';

@injectable()
export class QueueManager
  extends EventEmitter
  implements QueueManagerInterface
{
  private readonly queues: Map<string, Queue> = new Map();
  private readonly workers: Map<string, Worker> = new Map();
  private readonly redis: Redis;

  constructor(
    @inject('queue.config') private readonly config: QueueManagerConfig,
    @inject('queue.logger') private readonly logger?: Logger
  ) {
    super();

    this.redis =
      this.config.connection instanceof Redis
        ? this.config.connection.duplicate({ maxRetriesPerRequest: null })
        : new Redis(this.config.connection);

    this.logger?.info('QueueManager initialized');
  }

  subscribe<E extends QueueManagerEvent>(
    event: E,
    listener: E extends 'queueCreated' | 'queueRemoved'
      ? QueueManagerListener['queueEvent']
      : E extends 'workerCreated' | 'workerRemoved' | 'workerUpdated'
        ? QueueManagerListener['workerEvent']
        : E extends 'newListener' | 'removeListener'
          ? QueueManagerListener['listenerEvent']
          : E extends 'queueManagerClosed'
            ? QueueManagerListener['queueManagerClosed']
            : never
  ): void {
    this.on(event, listener);
    this.notify('newListener', event, listener);
  }

  unsubscribe(event: QueueManagerEvent, listener: (...args: any[]) => void) {
    this.off(event, listener);
    this.notify('removeListener', event, listener);
  }

  private notify(event: QueueManagerEvent, ...data: any[]) {
    this.emit(event, ...data);
  }

  createQueue<T = any>(
    name: string,
    options?: Partial<Omit<QueueOptions, 'connection'>>
  ): Queue<T> {
    if (this.queues.has(name)) {
      this.logger?.warn(
        `Queue ${name} already exists, returning existing queue`
      );
      return this.queues.get(name) as Queue<T>;
    }

    const queue = new Queue<T>(name, {
      ...options,
      connection: this.redis,
    });
    this.queues.set(name, queue);
    this.logger?.info(`Queue ${name} created`);
    this.notify('queueCreated', queue);

    return queue;
  }

  createWorker<P extends JobProcessor<T>, T = unknown>(
    queueName: string,
    processor: P,
    options?: Partial<Omit<WorkerOptions, 'connection'>>
  ): Worker<T> {
    if (this.workers.has(queueName)) {
      this.logger?.warn(
        `Worker for queue ${queueName} already exists, returning existing worker`
      );
      return this.workers.get(queueName)!;
    }

    const workerOptions: WorkerOptions = {
      connection: this.redis,
      ...options,
    };

    const wrappedProcessor = async (
      job: Job<T>,
      token?: string
    ): Promise<JobResult> => {
      try {
        const result = await processor.process(job, token);

        if (result.moveToDelay) {
          const targetQueueName = result.moveToDelay.queueName || queueName;
          const targetQueue = this.getQueue(targetQueueName);

          if (!targetQueue) {
            throw new Error(
              `Target queue ${targetQueueName} not found for moveToDelay`
            );
          }

          const jobOptions: JobsOptions = {
            delay: result.moveToDelay.delay,
            ...job.opts,
          };

          if (job.id) {
            jobOptions.jobId = job.id;
          }

          await targetQueue.add(job.name, job.data, jobOptions);

          job.log(
            `Job ${job.id} moved to delay queue ${targetQueueName} with ${result.moveToDelay.delay}ms delay`
          );

          return {
            success: true,
            data: {
              movedToDelay: true,
              targetQueue: targetQueueName,
              delay: result.moveToDelay.delay,
              originalResult: result.data,
            },
          };
        }

        return result;
      } catch (error) {
        this.logger?.error(`Error processing job ${job.id}:`, error);
        throw error;
      }
    };

    const worker = new Worker<T>(queueName, wrappedProcessor, workerOptions);
    this.workers.set(queueName, worker);
    this.logger?.info(`Worker for queue ${queueName} created`);

    this.notify('workerCreated', worker);

    return worker;
  }

  async addJob<T = JobData>(
    queueName: string,
    data: T,
    options?: QueueJobOptions
  ): Promise<Job<T>> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(
        `Queue ${queueName} not found. Create it first using createQueue()`
      );
    }

    const jobOptions = {
      ...this.config.defaultJobOptions,
      ...options,
    };

    const job = await queue.add(queueName, data, jobOptions);
    this.logger?.info(`Job added to queue ${queueName} with ID ${job.id}`);

    return job;
  }

  getAllQueues(): Queue[] {
    return Array.from(this.queues.values());
  }

  getQueue<T = any>(name: string): Queue<T> | undefined {
    return this.queues.get(name) as Queue<T> | undefined;
  }

  getAllWorkers(): Worker[] {
    return Array.from(this.workers.values());
  }

  getWorker<T = any>(queueName: string): Worker<T> | undefined {
    return this.workers.get(queueName);
  }

  async closeQueue(name: string): Promise<void> {
    const queue = this.queues.get(name);
    if (queue) {
      await queue.close();
      this.queues.delete(name);
      this.logger?.info(`Queue ${name} closed`);
      this.notify('queueRemoved', queue);
    }
  }

  async closeWorker(queueName: string): Promise<void> {
    const worker = this.workers.get(queueName);
    if (worker) {
      await worker.close();
      this.workers.delete(queueName);
      this.logger?.info(`Worker for queue ${queueName} closed`);
      this.notify('workerRemoved', worker);
    }
  }

  async closeAll(): Promise<void> {
    const queuePromises = Array.from(this.queues.keys()).map(name =>
      this.closeQueue(name)
    );
    const workerPromises = Array.from(this.workers.keys()).map(name =>
      this.closeWorker(name)
    );

    await Promise.all([...queuePromises, ...workerPromises]);
    await this.redis.quit();
    this.logger?.info('All queues and workers closed');
    this.notify('queueManagerClosed');
  }
}
