### Task 6: LangGraph agent — core invoice pipeline

- **Objective:** StateGraph processing a task end-to-end: parse → match → validate → generate
- **Implementation:** InvoiceAgentState typed schema. Node classes: ParseNode, MatchPartsNode (LLM call per job → {partId, confidence, note?}[], flags low-confidence), ValidateCompatibilityNode (cross-checks device-parts map, adds compatibilityWarning), GenerateOutputNode (delegates to Task 7 classes). Linear edges with conditional re-entry via CorrectionNode (Task 10). InvoiceAgent class wraps the compiled graph, registered in container. Integration test with fixture files + mocked LLM
- **Demo:** Running the graph on fixture inputs produces a valid ZIP with correct total sheet and per-client files