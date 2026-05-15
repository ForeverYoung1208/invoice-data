### Task 10: Correction node in LangGraph

- **Objective:** Apply natural language corrections to task state before re-generating output
- **Implementation:** CorrectionNode activated when state.pendingCorrection is set — sends result JSON + correction message to LLM → returns updated result JSON. Supported: remove job, add/remove/move part, edit quantity. Graph continues to GenerateOutputNode after applying. Unit tests with mocked LLM per correction type
- **Demo:** "Move toner cartridge from job 2 to job 4" → result JSON updated → new ZIP generated