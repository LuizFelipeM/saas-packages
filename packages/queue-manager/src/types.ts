import { Job, Queue, Worker, QueueOptions, WorkerOptions } from 'bullmq';

export interface JobData {
  [key: string]: any;
}

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
}

export type QueueManagerEvent =
  | "queueCreated"
  | "queueRemoved"
  | "workerCreated"
  | "workerRemoved"
  | "newListener"
  | "removeListener"
  | "queueManagerClosed";

export interface QueueManagerListener {
  queueEvent: (queue: Queue) => void;
  workerEvent: (worker: Worker) => void;
  listenerEvent: (event: string, listener: (...args: any[]) => void) => void;
  queueManagerClosed: () => void;
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

export interface QueueConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  prefix?: string;
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