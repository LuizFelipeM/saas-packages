import {
  Job,
  Queue,
  Worker,
  QueueOptions,
  WorkerOptions,
  ClusterOptions,
  RedisOptions,
} from 'bullmq';
import { EventEmitter } from 'events';
import Redis from 'ioredis';

export interface JobData {
  [key: string]: any;
}

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
  delay?: number;
}

export type QueueManagerEvent =
  | 'queueCreated'
  | 'queueRemoved'
  | 'workerCreated'
  | 'workerRemoved'
  | 'newListener'
  | 'removeListener'
  | 'queueManagerClosed';

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

export interface QueueManagerConfig {
  connection: Redis | RedisOptions | ClusterOptions;
  defaultJobOptions?: QueueJobOptions;
  prefix?: string;
}

export interface JobProcessor<T = JobData> {
  process(job: Job<T>, token?: string): Promise<JobResult>;
}

export interface QueueManagerInterface extends EventEmitter {
  createQueue<T = any>(name: string, options?: Partial<QueueOptions>): Queue<T>;
  createWorker<P extends JobProcessor<T>, T = unknown>(
    queueName: string,
    processor: P,
    options?: Partial<Omit<WorkerOptions, 'connection'>>
  ): Worker<T>;
  addJob<T = JobData>(
    queueName: string,
    data: T,
    options?: QueueJobOptions
  ): Promise<Job<T>>;
  getAllQueues(): Queue[];
  getQueue<T = any>(name: string): Queue<T> | undefined;
  getAllWorkers(): Worker[];
  getWorker<T = any>(queueName: string): Worker<T> | undefined;
  closeQueue(name: string): Promise<void>;
  closeWorker(queueName: string): Promise<void>;
  closeAll(): Promise<void>;
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
  ): void;
  unsubscribe(
    event: QueueManagerEvent,
    listener: (...args: any[]) => void
  ): void;
}
