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

export interface DatabaseManagerConfig<T extends PrismaClient> {
  prismaClient: T;
}

export interface DatabaseManagerInterface<T extends PrismaClient> {
  get client(): T;
  get isConnected(): boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  executeTransaction<R>(
    fn: (prisma: Omit<T, ITXClientDenyList>) => Promise<R>
  ): Promise<R>;
  healthCheck(): Promise<DatabaseHealthCheck>;
}

export interface DatabaseHealthCheck {
  status: 'healthy' | 'unhealthy';
  details: {
    connection: boolean;
    query: boolean;
    latency?: number;
  };
  error?: Error;
}
