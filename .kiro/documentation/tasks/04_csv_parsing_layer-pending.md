### Task 4: CSV parsing layer

- **Objective:** Parse all 4 input CSV files into typed domain objects
- **Implementation:** Abstract CSVParser<T> base class, concrete: JobsParser, ClientsParser, PartsParser, DevicePartsParser — each implements parse(filePath: string): Promise<T[]> via csv-parser or fast-csv. Typed interfaces: JobRow, ClientRow, PartRow, DevicePartRow. Unit tests with fixture CSV files covering normal + edge cases
- **Demo:** Unit tests pass; parsers return correctly typed arrays from fixture files