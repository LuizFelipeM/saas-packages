import { Job, Queue, Worker, QueueOptions, WorkerOptions } from 'bullmq';
import { QueueConfig } from '@saas-packages/core';

export interface JobData {
  [key: string]: any;
}

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface QueueJobOptions {
  delay?: number;
  priority?: number;
  attempts?: number;
  backoff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
}

export interface QueueManagerConfig extends QueueConfig {
  defaultJobOptions?: QueueJobOptions;
}

export interface JobProcessor<T = JobData> {
  process(job: Job<T>): Promise<JobResult>;
}

export interface QueueManagerInterface {
  createQueue(name: string, options?: Partial<QueueOptions>): Queue;
  createWorker(queueName: string, processor: JobProcessor, options?: Partial<WorkerOptions>): Worker;
  addJob<T = JobData>(
    queueName: string,
    data: T,
    options?: QueueJobOptions
  ): Promise<Job<T>>;
  getQueue(name: string): Queue | undefined;
  getWorker(queueName: string): Worker | undefined;
  closeQueue(name: string): Promise<void>;
  closeWorker(queueName: string): Promise<void>;
  closeAll(): Promise<void>;
} 