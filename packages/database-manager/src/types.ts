// Prisma type declarations - these will be resolved by the consuming application
declare global {
  interface PrismaClient {
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
    $transaction<T>(fn: (prisma: any) => Promise<T>): Promise<T>;
    $queryRaw(strings: TemplateStringsArray, ...values: any[]): Promise<any>;
  }
  
  type ITXClientDenyList = string | number | symbol;
}

export type DatabaseManagerLogLevel = 'info' | 'query' | 'warn' | 'error';

export type DatabaseManagerLogDefinition = {
  level: DatabaseManagerLogLevel;
  emit: 'event' | 'stdout';
};

export interface DatabaseConfig {
  url: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
}

export interface DatabaseManagerConfig extends DatabaseConfig {
  prismaClient: PrismaClient;
  logQueries?: boolean;
  logErrors?: boolean;
  logWarnings?: boolean;
  logInfo?: boolean;
}

export interface DatabaseManagerInterface {
  get client(): PrismaClient;
  get isConnected(): boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  executeTransaction<T>(
    fn: (prisma: Omit<PrismaClient, ITXClientDenyList>) => Promise<T>
  ): Promise<T>;
  healthCheck(): Promise<DatabaseHealthCheck>;
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
