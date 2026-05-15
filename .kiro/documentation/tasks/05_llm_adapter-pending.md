### Task 5: LLM adapter

- **Objective:** Single LLM interface, zero code change between dev (LiteLLM) and prod (Bedrock)
- **Implementation:** Abstract LLMAdapter class, concrete OpenAICompatibleAdapter wraps ChatOpenAI with baseURL+apiKey+model from env (LLM_BASE_URL, LLM_API_KEY, LLM_MODEL). LLMAdapterFactory.create() registered in container. Unit test with mocked HTTP
- **Demo:** Factory returns correct adapter per env; mock test confirms prompt/response round-trip