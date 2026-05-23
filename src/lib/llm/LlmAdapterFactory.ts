/**
 * Factory — creates the LLM adapter based on env configuration.
 *
 * Currently always returns an OpenAICompatibleAdapter pointed at the
 * configured endpoint (LiteLLM in dev, Bedrock in prod).
 */

import { LlmAdapter } from './LlmAdapter';
import { LlmConfig, OpenAICompatibleAdapter } from './OpenAICompatibleAdapter';

export class LlmAdapterFactory {
  private static instance: LlmAdapter | null = null;

  /**
   * Create (and cache) the LLM adapter singleton.
   *
   * @throws {Error} If LLM_API_KEY or LLM_MODEL are missing.
   */
  static create(): LlmAdapter {
    if (LlmAdapterFactory.instance) {
      return LlmAdapterFactory.instance;
    }

    const baseUrl = process.env.LLM_BASE_URL ?? 'http://localhost:4000/v1';
    const apiKey = process.env.LLM_API_KEY;
    const model = process.env.LLM_MODEL;

    if (!apiKey) {
      throw new Error('LLM_API_KEY environment variable is not set');
    }
    if (!model) {
      throw new Error('LLM_MODEL environment variable is not set');
    }

    const config: LlmConfig = { baseUrl, apiKey, model };
    LlmAdapterFactory.instance = new OpenAICompatibleAdapter(config);

    return LlmAdapterFactory.instance;
  }

  /**
   * Reset the cached instance (useful in tests).
   */
  static reset(): void {
    LlmAdapterFactory.instance = null;
  }
}
