/**
 * OpenAI-compatible LLM adapter.
 *
 * Wraps ChatOpenAI from @langchain/openai to implement the LlmAdapter
 * interface. Works with any OpenAI-compatible endpoint (LiteLLM in dev,
 * Bedrock in prod) — just change the baseURL via env.
 */

import { ChatOpenAI } from '@langchain/openai';
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages';
import {
  ChatMessage,
  ChatOptions,
  ChatResponse,
  LlmAdapter,
} from './LlmAdapter';

// Error class

export enum LlmErrorCode {
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  RATE_LIMIT = 'RATE_LIMIT',
  AUTH_FAILED = 'AUTH_FAILED',
  UNKNOWN = 'UNKNOWN',
}

export class LlmError extends Error {
  constructor(
    message: string,
    public code: LlmErrorCode,
  ) {
    super(message);
    this.name = 'LlmError';
  }
}

// Config

export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

// Adapter

export class OpenAICompatibleAdapter extends LlmAdapter {
  private readonly chatModel: ChatOpenAI;

  constructor(config: LlmConfig) {
    super();
    this.chatModel = new ChatOpenAI({
      model: config.model,
      apiKey: config.apiKey,
      configuration: {
        baseURL: config.baseUrl,
      },
      temperature: 0,
    });
  }

  async generate(
    messages: ChatMessage[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options?: ChatOptions,
  ): Promise<ChatResponse> {
    try {
      const lcMessages = messages.map((msg) => {
        switch (msg.role) {
          case 'system':
            return new SystemMessage({ content: msg.content });
          case 'user':
            return new HumanMessage({ content: msg.content });
          case 'assistant':
            return new AIMessage({ content: msg.content });
        }
      });

      const response = await this.chatModel.invoke(lcMessages);

      const content =
        typeof response?.content === 'string'
          ? response.content
          : JSON.stringify(response?.content ?? '');

      return {
        content,
        usage: parseUsage(response),
      };
    } catch (err) {
      if ('cause' in (err as any)) {
        console.error(
          'OpenAICompatibleAdapter.generate error:',
          (err as any).cause,
        );
      } else {
        console.error('OpenAICompatibleAdapter.generate error:', err);
      }
      throw classifyError(err);
    }
  }

  async generateJson<T>(
    messages: ChatMessage[],
    options?: ChatOptions,
  ): Promise<T> {
    const response = await this.generate(messages, options);
    let content = response.content;

    // Try to extract JSON from markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      content = jsonMatch[1];
    }

    try {
      return JSON.parse(content) as T;
    } catch {
      throw new LlmError(
        `LLM returned invalid JSON: ${response.content.slice(0, 200)}`,
        LlmErrorCode.INVALID_RESPONSE,
      );
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseUsage(response: any): ChatResponse['usage'] | undefined {
  const usage = response?.usage ?? response?.additional_kwargs?.usage;
  if (!usage) return undefined;
  return {
    promptTokens: usage.prompt_tokens ?? 0,
    completionTokens: usage.completion_tokens ?? 0,
  };
}

function classifyError(err: unknown): LlmError {
  if (err instanceof LlmError) return err;

  const message = err instanceof Error ? err.message : String(err);

  if (message.includes('429') || message.toLowerCase().includes('rate limit')) {
    return new LlmError(message, LlmErrorCode.RATE_LIMIT);
  }
  if (
    message.includes('401') ||
    message.toLowerCase().includes('auth') ||
    message.toLowerCase().includes('unauthorized')
  ) {
    return new LlmError(message, LlmErrorCode.AUTH_FAILED);
  }
  return new LlmError(message, LlmErrorCode.UNKNOWN);
}
