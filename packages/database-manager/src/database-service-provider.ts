import {
  injectable,
  BaseServiceProvider,
  Logger,
  DependencyContainer,
} from '@saas-packages/core';
import { DatabaseManager } from './database-manager';
import { DatabaseManagerConfig, DatabaseManagerInterface } from './types';

@injectable()
export class DatabaseServiceProvider extends BaseServiceProvider {
  constructor(
    private config: DatabaseManagerConfig,
    private logger?: Logger
  ) {
    super();
  }

  register(container: DependencyContainer): void {
    // Register the database manager configuration
    container.register('database.config', {
      useValue: this.config,
    });

    // Register the logger if provided
    if (this.logger) {
      container.register('database.logger', {
        useValue: this.logger,
      });
    }

    // Register the database manager as a singleton
    container.registerSingleton<DatabaseManagerInterface>(
      'database.manager',
      DatabaseManager
    );

    // Register the DatabaseManager class for direct instantiation
    container.register(DatabaseManager, {
      useClass: DatabaseManager,
    });
  }
}
