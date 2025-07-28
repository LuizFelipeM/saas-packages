import { injectable, inject, Logger } from '@saas-packages/core';
import {
  DatabaseManagerInterface,
  DatabaseManagerConfig,
  DatabaseHealthCheck,
} from './types';

@injectable()
export class DatabaseManager<T extends PrismaClient>
  implements DatabaseManagerInterface<T>
{
  private readonly prismaClient: T;
  private isPrismaClientConnected: boolean = false;

  constructor(
    @inject('database.config')
    private readonly config: DatabaseManagerConfig<T>,
    @inject('database.logger') private readonly logger?: Logger
  ) {
    if (!this.config.prismaClient) {
      throw new Error(
        'PrismaClient instance must be provided in database config'
      );
    }

    this.prismaClient = this.config.prismaClient;
    this.logger?.info('DatabaseManager initialized with provided PrismaClient');
  }

  get client(): T {
    return this.prismaClient;
  }

  get isConnected(): boolean {
    return this.isPrismaClientConnected;
  }

  async connect(): Promise<void> {
    try {
      await this.prismaClient.$connect();
      this.isPrismaClientConnected = true;
      this.logger?.info('Database connected successfully');
    } catch (error) {
      this.logger?.error('Failed to connect to database:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.prismaClient.$disconnect();
      this.isPrismaClientConnected = false;
      this.logger?.info('Database disconnected successfully');
    } catch (error) {
      this.logger?.error('Failed to disconnect from database:', error);
      throw error;
    }
  }

  async executeTransaction<R>(
    fn: (prisma: Omit<T, ITXClientDenyList>) => Promise<R>
  ): Promise<R> {
    try {
      const result = await this.prismaClient.$transaction(fn);
      this.logger?.debug('Transaction executed successfully');
      return result;
    } catch (error) {
      this.logger?.error('Transaction failed:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<DatabaseHealthCheck> {
    try {
      const startTime = Date.now();

      await this.prismaClient.$queryRaw`SELECT 1`;
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
        error:
          error instanceof Error ? error : new Error(JSON.stringify(error)),
      };
    }
  }
}
