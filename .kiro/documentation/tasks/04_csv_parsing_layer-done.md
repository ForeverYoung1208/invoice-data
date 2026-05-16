### Task 4: CSV parsing layer

- **Objective:** Parse all 4 input CSV files into typed domain objects
- **Implementation:** Abstract `CSVParser<T>` base class, concrete: `JobsParser`, `ClientsParser`, `PartsParser`, `DevicePartsParser` — each implements `parse(filePath: string): Promise<T[]>` via `csv-parser` or `fast-csv`. Typed interfaces: `JobRow`, `ClientRow`, `PartRow`, `DevicePartRow`. Unit tests with fixture CSV files covering normal + edge cases.
- **Demo:** Unit tests pass; parsers return correctly typed arrays from fixture files

#### Decomposition

##### 1. Preparation & Data Modeling
- **Define Interfaces:** Create typed interfaces (`JobRow`, `ClientRow`, `PartRow`, `DevicePartRow`).
- **Create Test Fixtures:** Prepare sample CSV files (happy path and edge cases).
- **Dependency Check:** Verify `csv-parser` or `fast-csv` availability.

##### 2. Base Infrastructure
- **Implement `CSVParser<T>`:** Create the abstract base class for common streaming/parsing logic.

##### 3. Concrete Parser Implementation
- **Implement specialized parsers:** `JobsParser`, `ClientsParser`, `PartsParser`, `DevicePartsParser`.

##### 4. Testing & Validation
- **Unit Test Suite:** Implement Jest tests for each parser.
- **Edge Case Coverage:** Ensure robust error handling and edge case management.
