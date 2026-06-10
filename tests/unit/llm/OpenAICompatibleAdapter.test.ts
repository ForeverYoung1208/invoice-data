import { ChatOpenAI } from '@langchain/openai';
import { AIMessage } from '@langchain/core/messages';

jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn(),
}));

import { OpenAICompatibleAdapter, LlmError, LlmErrorCode } from '../../../src/lib/llm/OpenAICompatibleAdapter';
import { LlmAdapterFactory } from '../../../src/lib/llm/LlmAdapterFactory';

const mockedChatOpenAI = ChatOpenAI as jest.MockedClass<typeof ChatOpenAI>;

// Helper to create a mock invoke implementation
function mockInvoke(resolveWith: any) {
  const mockInstance = { invoke: jest.fn().mockResolvedValue(resolveWith) };
  mockedChatOpenAI.mockImplementation(() => mockInstance as any);
  return mockInstance;
}

describe('OpenAICompatibleAdapter', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      LLM_BASE_URL: 'http://localhost:4000/v1',
      LLM_API_KEY: 'test-key',
      LLM_MODEL: 'test-model',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
    LlmAdapterFactory.reset();
  });

  describe('generate()', () => {
    it('should call ChatOpenAI with correct config and return ChatResponse', async () => {
      const mockInstance = mockInvoke(new AIMessage({ content: 'test response' }));

      const adapter = new OpenAICompatibleAdapter({
        baseUrl: 'http://localhost:4000/v1',
        apiKey: 'test-key',
        model: 'test-model',
      });

      const result = await adapter.generate([{ role: 'user', content: 'hello' }]);

      expect(mockedChatOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'test-model',
          apiKey: 'test-key',
          configuration: { baseURL: 'http://localhost:4000/v1' },
          temperature: 0,
        }),
      );
      expect(mockInstance.invoke).toHaveBeenCalled();
      expect(result).toEqual({
        content: 'test response',
        usage: undefined,
      });
    });

    it('should parse usage tokens from response', async () => {
      mockInvoke(
        new AIMessage({
          content: 'parsed response',
          additional_kwargs: {
            usage: { prompt_tokens: 10, completion_tokens: 20 },
          },
        }) as any,
      );

      const adapter = new OpenAICompatibleAdapter({
        baseUrl: 'http://localhost:4000/v1',
        apiKey: 'test-key',
        model: 'test-model',
      });

      const result = await adapter.generate([{ role: 'user', content: 'hello' }]);

      expect(result.usage).toEqual({
        promptTokens: 10,
        completionTokens: 20,
      });
    });
  });

  describe('generateJson()', () => {
    it('should parse valid JSON from the LLM response', async () => {
      mockInvoke(
        new AIMessage({
          content: JSON.stringify({ data: [1, 2, 3] }),
        }),
      );

      const adapter = new OpenAICompatibleAdapter({
        baseUrl: 'http://localhost:4000/v1',
        apiKey: 'test-key',
        model: 'test-model',
      });

      const result = await adapter.generateJson<{ data: number[] }>([
        { role: 'user', content: 'parse this' },
      ]);

      expect(result).toEqual({ data: [1, 2, 3] });
    });

    it('should throw LlmError with INVALID_RESPONSE for invalid JSON', async () => {
      mockInvoke(new AIMessage({ content: 'not valid json {{{' }));

      const adapter = new OpenAICompatibleAdapter({
        baseUrl: 'http://localhost:4000/v1',
        apiKey: 'test-key',
        model: 'test-model',
      });

      try {
        await adapter.generateJson<{ data: number[] }>([
          { role: 'user', content: 'parse this' },
        ]);
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(LlmError);
        expect((err as LlmError).code).toBe(LlmErrorCode.INVALID_RESPONSE);
        expect((err as LlmError).message).toContain('not valid json');
      }
    });
  });
});

describe('LlmAdapterFactory', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    LlmAdapterFactory.reset();
    process.env = {
      ...originalEnv,
      LLM_BASE_URL: 'http://localhost:4000/v1',
      LLM_API_KEY: 'test-key',
      LLM_MODEL: 'test-model',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
    LlmAdapterFactory.reset();
  });

  it('should create an adapter and cache it', () => {
    const adapter1 = LlmAdapterFactory.create();
    const adapter2 = LlmAdapterFactory.create();
    expect(adapter1).toBe(adapter2);
  });

  it('should throw when LLM_API_KEY is missing', () => {
    delete process.env.LLM_API_KEY;
    expect(() => LlmAdapterFactory.create()).toThrow('LLM_API_KEY environment variable is not set');
  });

  it('should throw when LLM_MODEL is missing', () => {
    delete process.env.LLM_MODEL;
    expect(() => LlmAdapterFactory.create()).toThrow('LLM_MODEL environment variable is not set');
  });

  it('should use default base URL when LLM_BASE_URL is not set', () => {
    delete process.env.LLM_BASE_URL;
    const adapter = LlmAdapterFactory.create();
    expect(adapter).toBeInstanceOf(OpenAICompatibleAdapter);
    // The adapter should still be created successfully with default URL
  });
});
