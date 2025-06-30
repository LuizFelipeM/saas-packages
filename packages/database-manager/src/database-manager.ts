import { Prisma, PrismaClient } from '@prisma/client';
import { ITXClientDenyList } from '@prisma/client/runtime/library';
import { injectable, inject } from '@saas-packages/core';
import {
  DatabaseManagerInterface,
  DatabaseManagerConfig,
  DatabaseHealthCheck,
} from './types';

@injectable()
export class DatabaseManager implements DatabaseManagerInterface {
  private client: PrismaClient;
  private logger: any;
  private config: DatabaseManagerConfig;
  private isConnectedFlag: boolean = false;

  constructor(
    @inject('database.config') config: DatabaseManagerConfig,
    @inject('database.logger') logger?: any
  ) {
    this.config = config;
    this.logger = logger || console;

    const logOptions: (Prisma.LogLevel | Prisma.LogDefinition)[] = [];
    if (this.config.logQueries)
      logOptions.push({ level: 'query', emit: 'event' });
    if (this.config.logErrors)
      logOptions.push({ level: 'error', emit: 'event' });
    if (this.config.logWarnings)
      logOptions.push({ level: 'warn', emit: 'event' });
    if (this.config.logInfo) logOptions.push({ level: 'info', emit: 'event' });

    this.client = new PrismaClient({
      datasources: {
        db: {
          url: this.config.url,
        },
      },
      log: logOptions.length > 0 ? logOptions : [],
    });

    this.logger.info('DatabaseManager initialized');
  }

  getClient(): PrismaClient {
    return this.client;
  }

  async connect(): Promise<void> {
    try {
      await this.client.$connect();
      this.isConnectedFlag = true;
      this.logger.info('Database connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.$disconnect();
      this.isConnectedFlag = false;
      this.logger.info('Database disconnected successfully');
    } catch (error) {
      this.logger.error('Failed to disconnect from database:', error);
      throw error;
    }
  }

  isConnected(): boolean {
    return this.isConnectedFlag;
  }

  async executeTransaction<T>(
    fn: (prisma: Omit<PrismaClient, ITXClientDenyList>) => Promise<T>
  ): Promise<T> {
    try {
      const result = await this.client.$transaction(fn);
      this.logger.debug('Transaction executed successfully');
      return result;
    } catch (error) {
      this.logger.error('Transaction failed:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const startTime = Date.now();

      // Test basic connection
      await this.client.$queryRaw`SELECT 1`;

      const latency = Date.now() - startTime;

      this.logger.debug(`Health check passed with latency: ${latency}ms`);
      return true;
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return false;
    }
  }

  async detailedHealthCheck(): Promise<DatabaseHealthCheck> {
    const startTime = Date.now();

    try {
      // Test connection
      await this.client.$queryRaw`SELECT 1`;
      const latency = Date.now() - startTime;

      return {
        status: 'healthy',
        details: {
          connection: true,
          query: true,
          latency,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          connection: false,
          query: false,
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
