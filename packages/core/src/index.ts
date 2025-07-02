import 'reflect-metadata';
import {
  container,
  singleton,
  injectable,
  inject,
  DependencyContainer,
} from 'tsyringe';

export { container, singleton, injectable, inject, DependencyContainer };

// Common interfaces and types
export interface ServiceProvider {
  register(container: any): void;
}

export interface Logger {
  info(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

// Default logger implementation
@injectable()
export class ConsoleLogger implements Logger {
  info(message: string, ...args: any[]): void {
    console.log(`[INFO] ${message}`, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(`[ERROR] ${message}`, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  }

  debug(message: string, ...args: any[]): void {
    console.debug(`[DEBUG] ${message}`, ...args);
  }
}

// Service provider base class
export abstract class BaseServiceProvider implements ServiceProvider {
  abstract register(container: any): void;
}
