import {
  DependencyContainer,
  injectable,
  BaseServiceProvider,
  Logger,
} from '@saas-packages/core';
import { QueueManager } from './queue-manager';
import { QueueManagerConfig, QueueManagerInterface } from './types';

@injectable()
export class QueueServiceProvider extends BaseServiceProvider {
  constructor(
    private config: QueueManagerConfig,
    private logger?: Logger
  ) {
    super();
  }

  register(container: DependencyContainer): void {
    // Register the queue manager configuration
    container.register('queue.config', {
      useValue: this.config,
    });

    // Register the logger if provided
    if (this.logger) {
      container.register('queue.logger', {
        useValue: this.logger,
      });
    }

    // Register the QueueManager class for direct instantiation
    container.registerSingleton<QueueManagerInterface>(
      'queue.manager',
      QueueManager
    );

    // Register the QueueManager class for direct instantiation
    container.register(QueueManager, {
      useClass: QueueManager,
    });
  }
}
