/**
 * Manual DI container — instantiates and exports all service singletons.
 * Import services from here, never instantiate them directly.
 */
import { AuthService } from './services/AuthService';
import { ConfigService } from './services/ConfigService';
import { TaskService } from './services/TaskService';

export const configService = new ConfigService();
export const authService = new AuthService();
export const taskService = new TaskService();
