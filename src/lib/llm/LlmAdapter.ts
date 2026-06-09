/**
 * LLM adapter — abstract interface + types.
 */

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

export interface CorrectionResponse {
  resultJson: string;
}

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
