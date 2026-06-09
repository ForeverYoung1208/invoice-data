### Subtask 6.2.1 — Replace Cyrillic bracket-notation DTO access with typed English-key interfaces

- **Status:** Completed. Spent: 0.5h

**Objective:** Eliminate Cyrillic magic strings used as TypeScript property keys across parsers, nodes, and output builders.

**What was done:**

- `src/lib/parsers/types.ts` — Rewrote all 4 interfaces (`IJobRow`, `IClientRow`, `IPartRow`, `IDevicePartRow`) with English keys. Cyrillic CSV column names kept as inline comments only.
- `src/lib/parsers/mappers.ts` — **New file.** Single source of truth: one mapper function per file role (`mapJobRow`, `mapClientRow`, `mapPartRow`, `mapDevicePartRow`). Only place in the codebase where Cyrillic CSV headers are referenced.
- `src/lib/parsers/CSVParser.ts` — Removed `abstract` modifier so parsers can instantiate it directly with `Record<string, string>`.
- `src/lib/parsers/JobsParser.ts`, `ClientsParser.ts`, `PartsParser.ts`, `DevicePartsParser.ts` — Each parser now calls `CSVParser<Record<string,string>>().parse()` and maps the result through its mapper.
- `src/lib/agent/nodes/MatchPartsNode.ts` — Updated all property accesses to use English keys (`job.jobNumber`, `p.salePrice`, `p.inStock`, etc.).
- `src/lib/output/TotalSheetBuilder.ts` — Removed last remaining Cyrillic bracket-access in `buildClientMap`.
- `src/lib/llm/LlmAdapter.ts` — Removed dead `ParseResult` interface and its unused parser type imports.
- All 4 parser unit tests updated to assert on English keys.

**Result:** 40/40 tests pass. Zero Cyrillic strings used as TS property accessors anywhere outside `mappers.ts`.
