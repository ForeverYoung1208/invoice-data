### Task 6: LangGraph agent — core invoice pipeline

- **Objective:** StateGraph processing a task end-to-end: parse → match → validate → generate
- **Implementation:** InvoiceAgentState typed schema. Node classes: ParseNode, MatchPartsNode (LLM call per job → {partId, confidence, note?}[], flags low-confidence), ValidateCompatibilityNode (cross-checks device-parts map, adds compatibilityWarning), GenerateOutputNode (delegates to Task 7 classes). Linear edges with conditional re-entry via CorrectionNode (Task 10). InvoiceAgent class wraps the compiled graph, registered in container. Integration test with fixture files + mocked LLM
- **Demo:** Running the graph on fixture inputs produces a valid ZIP with correct total sheet and per-client files

---

## Decomposition into Subtasks

### Subtask 6.1 — Project scaffolding: LangGraph state schema, node interface, and file layout

**Goal:** Establish the folder structure, the shared `InvoiceAgentState` type, and the abstract node interface so all subsequent subtasks have a common foundation.

**What to do:**

- Create `src/lib/agent/` directory with the following file layout:
  - `types.ts` — the `InvoiceAgentState` interface
  - `nodes/` — subdirectory for all node classes
  - `InvoiceAgent.ts` — the wrapper class that compiles the graph
- Define `InvoiceAgentState` based on the existing types:
  - `taskId: string` — reference back to the DB task
  - `instructions: string` — user instructions from Task model
  - `jobs: JobRow[]` — parsed from jobs CSV
  - `clients: ClientRow[]` — parsed from clients CSV
  - `parts: PartRow[]` — parsed from parts catalog
  - `devices: DevicePartRow[]` — parsed from device-parts catalog
  - `matchedJobs: MatchedJob[]` — built up by MatchPartsNode
  - `warnings: string[]` — accumulated warning messages from ValidateCompatibilityNode
  - `errors: string[]` — accumulated error messages
- Define an abstract `BaseNode` interface with a single method:
  - `execute(state: InvoiceAgentState): Promise<Partial<InvoiceAgentState>>`
  - Each concrete node implements this interface
- Add TODO comments in each file pointing to the relevant subtask

**Why:** LangGraph's `StateGraph` requires a reducer function that merges partial state returns. By defining a clean state shape upfront and a consistent node contract, every subsequent node follows the same pattern. The reducer can be a simple spread-merge since each node only writes its own fields.

**Dependencies:** None (foundation subtask).

**Estimated effort:** 0.5h

---

### Subtask 6.2 — ParseNode: ingest 4 CSV files into structured state

**Goal:** A node that reads the 4 uploaded CSV files from disk, parses them using the existing parsers (Tasks 1–4), and writes the results into state.

**Responsibility boundary:** `InvoiceAgent.run()` loads the task metadata from the database, including the related `TaskFile` records, and places those file references into the initial graph state. `ParseNode` does not query the database. It only receives the task file references from `InvoiceAgentState`, validates that the required roles are present, reads the referenced files from disk, and parses them. This keeps database orchestration in the agent wrapper and CSV parsing inside the parse node.

**What to do:**

- Create `src/lib/agent/nodes/ParseNode.ts`
- Implement `execute(state)`:
  - Read `taskFiles` from `InvoiceAgentState`; paths are already resolved from `TaskFile` records by `InvoiceAgent.run()`
  - Instantiate `JobsParser`, `ClientsParser`, `PartsParser`, `DevicePartsParser`
  - Call `.parse(filePath)` on each to get `JobRow[]`, `ClientRow[]`, `PartRow[]`, `DevicePartRow[]`
  - Combine with `state.instructions` into state
  - Return `{ jobs, clients, parts, devices }` — a partial state update
- Add validation: throw `Error` if any file is empty or missing (errors go into `state.errors`)
- Add logging: `console.log` count of rows parsed per file

**Why:** This is the graph entry point. It converts raw CSV files on disk into the structured data that downstream nodes (match, validate) need. It reuses the existing parser classes from Task 4 — no duplication.

Keeping DB loading out of `ParseNode` makes the node deterministic and easy to test: a unit test can pass fake `TaskFile` references directly in state without mocking TypeORM or `TaskService`. It also matches the LangGraph pattern where nodes transform state, while the graph wrapper prepares the initial state.

**Dependencies:** Subtask 6.1 (state schema, node interface).

**Estimated effort:** 0.5h

---

### Subtask 6.3 — MatchPartsNode: LLM-driven part matching per job

**Goal:** A node that iterates over every job from ParseNode, invokes the LLM to find matching parts from the catalog, and builds `MatchedJob` objects with confidence scores and flags.

**What to do:**

- Create `src/lib/agent/nodes/MatchPartsNode.ts`
- Implement `execute(state)`:
  - For each `JobRow`, construct an LLM prompt that includes:
    - The job description (fault description, device type, model)
    - The full parts catalog (article, name, category, price, availability)
    - The user instructions (from state)
    - A JSON schema for the response: `{ partId, partName, category, price, quantity, isUncertain, comment }[]`
  - Call `llmAdapter.generateJson<MatchedPart[]>(messages)` per job
  - Build `MatchedJob` objects from the job data + matched parts
  - Compute `matchedTotal` per job (Σ price × quantity)
  - Set `flags: ['⚠️ Невпевнено']` for any part with `isUncertain: true`
  - Set `warningLevel: 0` for all parts here (compatibility check happens in ValidateCompatibilityNode)
  - Return `{ matchedJobs }` — the accumulated list of all matched jobs
- Implement prompt engineering:
  - System message: instruct the LLM to match repair parts based on fault description, device model, and catalog
  - User message: structured data with jobs + catalog + instructions
  - Temperature: use 0 for deterministic results
  - Max tokens: tune based on catalog size
- Add retry logic for LLM errors (1 retry with exponential backoff for rate limits)

**Why:** This is the core "agentic" step. The LLM is the intelligence that maps free-text fault descriptions to structured parts. Per-job invocation allows fine-grained matching and produces per-job confidence signals.

**Dependencies:** Subtask 6.1 (state schema), Task 5 (LlmAdapter interface and OpenAICompatibleAdapter).

**Estimated effort:** 2h

---

### Subtask 6.4 — ValidateCompatibilityNode: cross-check device-part compatibility

**Goal:** A node that reviews every `MatchedPart` from MatchPartsNode against the device-parts catalog (Task 4) and flags incompatible matches.

**What to do:**

- Create `src/lib/agent/nodes/ValidateCompatibilityNode.ts`
- Implement `execute(state)`:
  - For each `MatchedJob` in `state.matchedJobs`:
    - Look up the device's compatibility rules from `state.devices`:
      - `Типові запчастини` (recommended parts list — partial match on part article/name)
      - `Чорний список запчастин` (forbidden parts — partial match on part article/name)
    - For each `MatchedPart` in that job:
      - Check if the part itself (article number or name, not just category) is in the blacklisted list → set `part.warningLevel = 1`, add warning message
      - Check if the part is NOT in the recommended parts list (`Типові запчастини`) → set `part.warningLevel = 0.5` (soft warning — the part works but isn't the typical choice)
    - Collect job-level warnings into `job.warnings` (strings describing the issue)
  - Return `{ matchedJobs }` — the modified list with warningLevels populated
- No LLM call here — this is deterministic cross-referencing
- Add logging for every warning produced (for audit trail)

**Why:** Compatibility validation is a rule-based check, not an LLM task. The device-parts catalog contains explicit compatibility rules. This node acts as a quality gate that catches catalog mismatches the LLM might have missed. It runs after the LLM match because the LLM produces the candidates, and this node validates them against hard rules.

**Dependencies:** Subtask 6.3 (MatchPartsNode produces `matchedJobs`).

**Estimated effort:** 1h

---

### Subtask 6.5 — GenerateOutputNode: delegate to output builders and save results

**Goal:** A node that takes the fully processed `matchedJobs` from state, delegates to the output generation classes (Task 7), saves the result JSON to the database, and writes the ZIP to disk.

**What to do:**

- Create `src/lib/agent/nodes/GenerateOutputNode.ts`
- Implement `execute(state)`:
  - Build `OutputData` from `state.matchedJobs`, `state.instructions`, and current date
  - Call `totalSheetBuilder.build(data)` → CSV string
  - Call `clientCSVWriter.write(clientData)` → per-client CSV files
  - Call `outputZipper.assemble(totalCsv, clientCsvPaths, outputPath, ...)` → ZIP file
  - Determine the zip file path and save it
  - Save `OutputData` as JSON into `TaskResult.resultJson` via `TaskService`
  - Return `{ zipPath }` for the graph to record
- Handle the case where `matchedJobs` is empty (skip ZIP generation, set error)
- Wrap the entire operation in try/catch — on failure, push error to `state.errors` and return partial state so the graph can fail gracefully

**Why:** This node is the bridge between the LangGraph agent and the output layer (Task 7). It doesn't re-implement CSV generation logic — it assembles the data and delegates to the already-tested builders. The ZIP path is stored so the worker (Task 8) can later update the task status to `review`.

**Dependencies:** Subtask 6.4 (validated `matchedJobs`), Task 7 (`TotalSheetBuilder`, `ClientCSVWriter`, `OutputZipper`), Task 3 (`TaskService`).

**Estimated effort:** 1h

---

### Subtask 6.6 — Assemble the StateGraph: wiring nodes, edges, and the `InvoiceAgent` wrapper

**Goal:** Wire all nodes together into a compiled LangGraph `StateGraph` and create the `InvoiceAgent` class that users and the worker call to execute the pipeline.

**What to do:**

- Create `src/lib/agent/InvoiceAgent.ts`
- Inside `InvoiceAgent` constructor:
  - Inject `llmAdapter` and `taskService` via DI
  - Instantiate all 4 node classes
  - Create a `StateGraph<InvoiceAgentState>` with a reducer function (spread-merge)
  - Add each node as a graph node:
    - `addNode('parse', parseNode)`
    - `addNode('match', matchNode)`
    - `addNode('validate', validateNode)`
    - `addNode('generate', generateNode)`
  - Set the entry point: `setEntryPoint('parse')`
  - Add edges:
    - `parse → match` (always)
    - `match → validate` (always)
    - `validate → generate` (always)
    - `generate → END` (always)
  - Compile the graph
  - Store the compiled graph as a property for reuse
- Expose a single public method:
  - `async run(taskId: string, instructions: string): Promise<InvoiceAgentState>`
  - This method:
    - Loads the `Task` from the database through `TaskService.findById(taskId)`
    - Validates that all four required `TaskFileRole` entries exist
    - Creates initial state `{ taskId, instructions, taskFiles }`
    - Runs `graph.invoke(initialState)`
    - Returns the final state
- Add `hasErrors()` helper: returns `state.errors.length > 0`

**Why:** The compiled graph is an immutable, reusable pipeline. The `InvoiceAgent` wrapper encapsulates the graph lifecycle — creating initial state, invoking the graph, handling results. This is the class that Task 8's worker will call. It isolates LangGraph details from the rest of the application.

**Dependencies:** Subtasks 6.2–6.5 (all node classes exist).

**Estimated effort:** 1h

---

### Subtask 6.7 — Register `InvoiceAgent` in DI container

**Goal:** Make `InvoiceAgent` available as a singleton via the existing DI pattern (`container.ts`).

**What to do:**

- Edit `src/lib/container.ts`:
  - Import `InvoiceAgent`
  - Create `export const invoiceAgent = new InvoiceAgent()`
  - Ensure `llmAdapter` and `taskService` are instantiated before `invoiceAgent` (they are, since they're already exported earlier in the file)
- No changes to existing exports

**Why:** The worker (Task 8) needs to call `invoiceAgent.run(taskId, instructions)`. DI keeps it testable and consistent with the rest of the codebase.

**Dependencies:** Subtask 6.6 (`InvoiceAgent` class exists).

**Estimated effort:** 0.25h

---

### Subtask 6.8 — Integration test: fixture-driven end-to-end graph execution

**Goal:** Verify the entire pipeline (parse → match → validate → generate) works on realistic fixture data with a mocked LLM, producing valid output files.

**What to do:**

- Create `tests/agent/integration/InvoiceAgent.integration.test.ts` (Jest)
- Create fixture files in `tests/fixtures/agent/`:
  - `small_jobs.csv` — 5–10 jobs with varied fault descriptions
  - `small_clients.csv` — 3–4 clients
  - `small_parts.csv` — 10–15 parts covering various categories
  - `small_devices.csv` — 3–4 device compatibility rules
  - `instructions.txt` — 1–2 lines of user instructions
- In the test:
  - Point the fixture paths to the test directory
  - Mock `llmAdapter.generateJson` to return predetermined `MatchedPart[]` for each job
  - Call `invoiceAgent.run(taskId, instructions)`
  - Assert:
    - `state.matchedJobs` has the correct number of jobs
    - Each `MatchedJob` has `matchedParts` populated
    - `isUncertain` flags are correctly set based on mock data
    - `warningLevel` values are correctly set based on device compatibility (0 = none, 0.5 = not recommended, 1 = blacklisted)
    - `OutputData` can be built into a total sheet CSV
    - The ZIP file is created at the expected path
    - ZIP contains `total_YYYY_MM_DD.csv` + per-client files
    - `state.errors` is empty
- Add a second test for error path:
  - Mock `llmAdapter.generateJson` to throw `LlmError`
  - Assert the graph handles the error gracefully (errors collected in `state.errors`)
- Cleanup: delete temp files after each test

**Why:** This is the proof that the pipeline works as a whole. Unit tests for individual nodes (next effort) verify each step, but this integration test proves the full chain — from raw CSV to ZIP output — produces correct results. The mocked LLM makes it deterministic and fast.

**Dependencies:** Subtask 6.7 (container registration), Task 7 (output classes tested separately).

**Estimated effort:** 1.5h

---

## Summary

| Subtask | Name | Estimated | Dependencies |
|---------|------|-----------|--------------|
| 6.1 | State schema, node interface, file layout | 0.5h | — |
| 6.2 | ParseNode | 0.5h | 6.1 |
| 6.3 | MatchPartsNode (LLM per job) | 2h | 6.1, Task 5 |
| 6.4 | ValidateCompatibilityNode | 1h | 6.3 |
| 6.5 | GenerateOutputNode | 1h | 6.4, Task 7 |
| 6.6 | Assemble StateGraph + InvoiceAgent wrapper | 1h | 6.2–6.5 |
| 6.7 | DI container registration | 0.25h | 6.6 |
| 6.8 | Integration test | 1.5h | 6.7, Task 7 |
| **Total** | | **8.25h** | |

> **Note:** The original estimate for Task 6 was 6h. The decomposition reveals additional detail (especially LLM prompt engineering in 6.3 and integration testing in 6.8) that may extend the effort. Consider adjusting the estimate to 8–10h if LLM prompt tuning requires iteration.

## Design Decisions & Rationale

1. **State shape mirrors input/output types.** `InvoiceAgentState` uses the same types (`JobRow`, `PartRow`, `MatchedJob`, etc.) that already exist in the codebase. This avoids type duplication and ensures the graph state is directly consumable by the output builders (Task 7).

2. **LLM calls are per-job, not batch.** MatchPartsNode calls the LLM once per job. This is more robust than a single batch call because:
   - Each job gets focused context (no token overflow from large catalogs)
   - Individual job failures don't poison the entire batch
   - It's easier to retry or skip problematic jobs

3. **ValidateCompatibilityNode is deterministic.** Compatibility rules from the device-parts catalog are explicit (recommended parts list + blacklist). This is a rule-based check, not an LLM task. It operates at the part level (article/name), not just category level. Keeping it deterministic makes the pipeline more predictable.

4. **GenerateOutputNode delegates, doesn't duplicate.** The output builders (`TotalSheetBuilder`, `ClientCSVWriter`, `OutputZipper`) are already tested in Task 7. This node only assembles the data and calls them — no CSV generation logic here.

5. **Graph edges are linear (no branching yet).** The conditional re-entry via `CorrectionNode` (Task 10) is planned but not implemented here. The graph currently flows: `parse → match → validate → generate → END`. CorrectionNode will be added as a separate edge from `generate` back to `parse` (or to a correction-specific node).

6. **Error accumulation via state.errors.** Instead of throwing on the first error, each node pushes errors into `state.errors[]`. This allows the pipeline to process what it can and report all issues at the end. The worker (Task 8) can then decide whether to mark the task as `FAILED` or `REVIEW`.

7. **File paths resolved at runtime.** Nodes receive file paths via state (set from `TaskFile` records in the DB). This keeps nodes stateless and testable — they don't need to know about the database or filesystem layout.
