### Task 10: Correction node in LangGraph

- **Objective:** Apply natural language corrections to task state before re-generating output
- **Implementation:** CorrectionNode activated when state.pendingCorrection is set — sends result JSON + correction message to LLM → returns updated result JSON. Supported: remove job, add/remove/move part, edit quantity, other natural language commands. Graph continues to GenerateOutputNode after applying. Unit tests with mocked LLM per correction type
- **Demo:** "Add additional toner cartridge to job 4" → result JSON updated → new ZIP generated

---

### Subtasks

**10.1 — Add `pendingCorrection` to agent state**
Add `pendingCorrection: string` field to `InvoiceAgentStateAnnotation` in `annotation.ts`. This is the signal that routes the graph through `CorrectionNode` instead of `parse → match → validate`.

**10.2 — Implement `CorrectionNode`**
New file `src/lib/agent/nodes/CorrectionNode.ts`. Receives `state.matchedJobs` + `state.pendingCorrection`, sends them to the LLM with a structured prompt, parses the returned JSON back into `IMatchedJob[]`, returns `{ matchedJobs, pendingCorrection: '' }`.

**10.3 — Wire `CorrectionNode` into the graph with conditional routing**
In `InvoiceAgent.ts`: add the `correct` node, add a conditional edge from `START` — if `pendingCorrection` is set → go to `correct → generate`; otherwise → go to `parse → match → validate → generate`.

**10.4 — Pass `pendingCorrection` from the worker**
Add `appliedAt: Date | null` column to `CorrectionLog` entity + migration. In `InvoiceAgent.run()`: fetch the oldest unprocessed correction (`ORDER BY createdAt ASC`, `appliedAt IS NULL`, `LIMIT 1`) and pass it as `pendingCorrection` in the initial state. After a successful run, set `appliedAt = NOW()` on that correction record. This FIFO approach handles the case where the user submits a new correction while the previous one is still being processed.