### Task 4: Excel parsing layer

- **Objective:** Parse all 4 input xlsx files into typed domain objects
- **Implementation:** Abstract ExcelParser<T> base class, concrete: JobsParser, ClientsParser, PartsParser, DevicePartsParser — each implements parse(filePath: string): Promise<T[]> via ExcelJS. Typed interfaces: JobRow, ClientRow, PartRow, DevicePartRow. Unit tests with fixture xlsx files covering normal + edge cases
- **Demo:** Unit tests pass; parsers return correctly typed arrays from fixture files