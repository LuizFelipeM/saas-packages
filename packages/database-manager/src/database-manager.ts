// PrismaClient will be provided by the consuming application
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

    if (!this.config.prismaClient) {
      throw new Error('PrismaClient instance must be provided in database config');
    }

    this.client = this.config.prismaClient;
    this.logger.info('DatabaseManager initialized with provided PrismaClient');
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
