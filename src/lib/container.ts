/**
 * Manual DI container — instantiates and exports all service singletons.
 * Import services from here, never instantiate them directly.
 */
import { AuthService } from './services/AuthService';
import { ConfigService } from './services/ConfigService';
import { TaskService } from './services/TaskService';
import { TaskResultRepository } from './db/repositories/TaskResultRepository';
import { LlmAdapterFactory } from './llm/LlmAdapterFactory';
import { InvoiceAgent } from './agent/InvoiceAgent';

import { TotalSheetBuilder } from './output/TotalSheetBuilder';
import { ClientCSVWriter } from './output/ClientCSVWriter';
import { OutputZipper } from './output/OutputZipper';

export const configService = new ConfigService();
export const authService = new AuthService();
export const taskService = new TaskService();
export const taskResultRepository = new TaskResultRepository();
export const llmAdapter = LlmAdapterFactory.create();

// Output generation singletons
export const totalSheetBuilder = new TotalSheetBuilder();
export const clientCSVWriter = new ClientCSVWriter();
export const outputZipper = new OutputZipper();

export const invoiceAgent = new InvoiceAgent(
  taskService,
  llmAdapter,
  taskResultRepository,
  configService,
  outputZipper,
);
