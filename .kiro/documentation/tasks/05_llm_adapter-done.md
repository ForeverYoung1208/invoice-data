### Task 5: LLM adapter

- **Objective:** Single LLM interface, zero code change between dev (LiteLLM) and prod (Bedrock)
- **Implementation:** Abstract LLMAdapter class, concrete OpenAICompatibleAdapter wraps ChatOpenAI with baseURL+apiKey+model from env (LLM_BASE_URL, LLM_API_KEY, LLM_MODEL). LLMAdapterFactory.create() registered in container. Unit test with mocked HTTP
- **Demo:** Factory returns correct adapter per env; mock test confirms prompt/response round-trip

**Status: COMPLETED. Spent: 0.5h**

- ✅ `src/lib/llm/LlmAdapter.ts` — types + abstract class
- ✅ `src/lib/llm/OpenAICompatibleAdapter.ts` — concrete impl with LlmError + LlmErrorCode
- ✅ `src/lib/llm/LlmAdapterFactory.ts` — factory with singleton caching
- ✅ `tests/unit/llm/OpenAICompatibleAdapter.test.ts` — 8 tests, all passing
- ✅ `src/lib/container.ts` — updated with `llmAdapter` export
- ✅ Zero TypeScript errors

### Decomposed Sub-steps

#### Sub-step 5.1: Create LLM types & abstract adapter
**File:** `src/lib/llm/LlmAdapter.ts`

- Define message and chat response interfaces:
  - `ChatMessage` — `{ role: 'system' | 'user' | 'assistant', content: string }`
  - `ChatOptions` — `{ temperature?: number; maxTokens?: number }`
  - `ChatResponse` — `{ content: string; usage?: { promptTokens: number; completionTokens: number } }`
  - `ParseResult` — `{ jobs: JobRow[]; clients: ClientRow[]; parts: PartRow[]; devices: DevicePartRow[]; instructions: string }` — the structured output the agent needs
  - `CorrectionResponse` — `{ resultJson: string }` — for correction node (used later by Task 10, but adapter should support it)
- Create abstract class `LlmAdapter` with:
  - `abstract generate(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>`
  - `abstract generateJson<T>(messages: ChatMessage[], options?: ChatOptions): Promise<T>` — LLM call + JSON parsing wrapper
- Follow OOP pattern (class, not factory function or plain functions)
- No concrete imports — pure abstract, matches `AuthService`/`TaskService` style

#### Sub-step 5.2: Create OpenAI-compatible adapter implementation
**File:** `src/lib/llm/OpenAICompatibleAdapter.ts`

- Import `ChatOpenAI` from `@langchain/openai` and `AIMessage`, `HumanMessage`, `SystemMessage` from `@langchain/core/messages`
- Implement `LlmAdapter` with:
  - Constructor takes `config: LlmConfig` — `{ baseUrl: string; apiKey: string; model: string }`
  - `generate()`: maps `ChatMessage[]` → `@langchain/core/messages` array → calls `ChatOpenAI.invoke()` → returns `ChatResponse`
  - `generateJson<T>()`: same flow but parses the response string as JSON + validates with `try/catch`, throws on invalid JSON
- Reads config from `process.env.LLM_BASE_URL`, `process.env.LLM_API_KEY`, `process.env.LLM_MODEL` (or accepts injected config for testability)
- Set `temperature` and `maxTokens` from options
- Error handling: wrap `@langchain/openai` errors in a custom `LlmError` class with `message`, `code` (e.g., `'RATE_LIMIT'`, `'AUTH_FAILED'`, `'INVALID_RESPONSE'`)

#### Sub-step 5.3: Create factory + register in container
**File:** `src/lib/llm/LlmAdapterFactory.ts`

- Create `LlmAdapterFactory` class with static `create(): LlmAdapter` method
- Reads env vars: `LLM_BASE_URL` (default `http://localhost:4000/v1`), `LLM_API_KEY` (throws if missing), `LLM_MODEL` (throws if missing)
- Returns `new OpenAICompatibleAdapter({ baseUrl, apiKey, model })`
- **Future extensibility:** leave a `createForBedrock()` path open (the env var `LLM_PROVIDER` could switch between `litellm` and `bedrock`)

**Update:** `src/lib/container.ts`
- Import `LlmAdapterFactory`
- Add `export const llmAdapter = LlmAdapterFactory.create()` at the bottom

#### Sub-step 5.4: Write unit tests
**Directory:** `tests/unit/llm/`

**File:** `tests/unit/llm/OpenAICompatibleAdapter.test.ts`

- **Test 1 — `generate()` with mocked HTTP:**
  - Mock `ChatOpenAI` constructor (use `jest.mock` or manual mock)
  - Mock `invoke()` to resolve with `new AIMessage({ content: 'test response' })`
  - Instantiate adapter, call `generate([{ role: 'user', content: 'hello' }])`
  - Assert `ChatResponse` has `content === 'test response'`
  - Assert `ChatOpenAI` was constructed with correct `model`, `baseUrl`, `apiKey`

- **Test 2 — `generateJson()` with mocked HTTP:**
  - Mock `invoke()` to return `JSON.stringify({ data: [1, 2, 3] })`
  - Call `generateJson<{ data: number[] }>(...)`
  - Assert return value is `{ data: [1, 2, 3] }`

- **Test 3 — `generateJson()` with invalid JSON:**
  - Mock `invoke()` to return `not valid json {{{`
  - Assert `generateJson()` throws `LlmError` with code `'INVALID_RESPONSE'`

- **Test 4 — Factory throws when API key missing:**
  - Set `LLM_API_KEY` to empty, call `LlmAdapterFactory.create()`
  - Assert throws with descriptive message

#### Sub-step 5.5: Verification
- Verify no existing route handler calls `llmAdapter` — if not, this is N/A
- Verify the factory registration in `container.ts` doesn't break existing imports (it shouldn't — just one extra line)

---

### Files to Create/Modify

| Action | File |
|--------|------|
| Create | `src/lib/llm/LlmAdapter.ts` — types + abstract class |
| Create | `src/lib/llm/OpenAICompatibleAdapter.ts` — concrete impl |
| Create | `src/lib/llm/LlmAdapterFactory.ts` — factory |
| Create | `tests/unit/llm/OpenAICompatibleAdapter.test.ts` — 4 tests |
| Modify | `src/lib/container.ts` — add `llmAdapter` export |

### Design Decisions

1. **No separate config service** — env vars read directly in adapter (matches `ConfigService` being minimal and unused for LLM config)
2. **`generateJson<T>()` generic** — needed for LangGraph nodes (Task 6) that will parse structured results from the LLM
3. **`LlmError` with codes** — enables the worker (Task 8) to distinguish `RATE_LIMIT` (retry) from `INVALID_RESPONSE` (hard fail)
4. **Abstract factory pattern** — not a simple `new OpenAICompatibleAdapter()` everywhere; the factory centralizes env reading and lets Task 10 (correction) reuse it
5. **No Zod/validation library** — keep it lean; JSON parsing with try/catch is sufficient for POC level
6. **`@langchain/core/messages` types** — project already has `@langchain/core` installed; use `AIMessage`, `HumanMessage`, `SystemMessage` from it