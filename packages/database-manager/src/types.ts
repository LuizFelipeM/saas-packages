import { PrismaClient } from '@prisma/client';
import { ITXClientDenyList } from '@prisma/client/runtime/library';

export interface DatabaseConfig {
  url: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
}

export interface DatabaseManagerConfig extends DatabaseConfig {
  logQueries?: boolean;
  logErrors?: boolean;
  logWarnings?: boolean;
  logInfo?: boolean;
}

export interface DatabaseManagerInterface {
  getClient(): PrismaClient;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  executeTransaction<T>(
    fn: (prisma: Omit<PrismaClient, ITXClientDenyList>) => Promise<T>
  ): Promise<T>;
  healthCheck(): Promise<boolean>;
}

export interface MigrationResult {
  success: boolean;
  appliedMigrations?: string[];
  error?: string;
}

export interface DatabaseHealthCheck {
  status: 'healthy' | 'unhealthy';
  details: {
    connection: boolean;
    query: boolean;
    latency?: number;
  };
  error?: string;
}
