/**
 * LLM adapter — abstract interface + types.
 *
 * All LLM interactions flow through this interface so that the concrete
 * provider (LiteLLM, Bedrock, mock, etc.) can be swapped without touching
 * application code.
 */

import type {
  JobRow,
  ClientRow,
  PartRow,
  DevicePartRow,
} from '@/lib/parsers/types';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface ParseResult {
  jobs: JobRow[];
  clients: ClientRow[];
  parts: PartRow[];
  devices: DevicePartRow[];
  instructions: string;
}

export interface CorrectionResponse {
  resultJson: string;
}

/**
 * Abstract LLM adapter — subclasses must implement the two generation
 * methods.
 */
export abstract class LlmAdapter {
  abstract generate(
    messages: ChatMessage[],
    options?: ChatOptions,
  ): Promise<ChatResponse>;

  abstract generateJson<T>(
    messages: ChatMessage[],
    options?: ChatOptions,
  ): Promise<T>;
}
