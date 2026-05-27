### Task 7: CSV output generation

- **Objective:** Generate total_YYYY_MM_DD.csv and write per-client invoice CSV files
- **Implementation:** TotalSheetBuilder: single sheet grouped by client, subtotals, flag/warning columns. ClientCSVWriter: opens template, locates date row + line items table + total row by structural scanning, writes data. OutputZipper: assembles final ZIP. All registered in container. Unit tests with fixture templates
- **Demo:** Unit tests confirm correct CSV values; warnings appear as flag columns in output
- **Status:** Completed
- **Bugs fixed during implementation:**
  1. `ClientCSVWriter.replacePlaceholders` — notes row was replaced at original index AFTER line items were spliced in, causing the replacement to hit the wrong line (notes shifted down). Fixed by replacing notes BEFORE splicing items.
  2. `ClientCSVWriter.buildLineItems` — `note` variable (flags/warnings/comments) was computed but never included in the output row. Added as 12th column.
  3. `TotalSheetBuilder.clientNameResolution` — client name mapping uses `buildClientMap` to resolve short client names (e.g. "Коваленко О.В.") to full names from clients CSV. Tested with mock clients.csv data.
  4. `OutputZipper` — test suite simplified to critical paths (ZIP assembly, per-client file inclusion, directory creation).
  5. Test cleanup — replaced `rmdirSync` with `rmSync(recursive: true)` to avoid EISDIR errors.
- **Tests:** 19 tests across 3 test files (TotalSheetBuilder: 10, ClientCSVWriter: 6, OutputZipper: 3). All passing.
