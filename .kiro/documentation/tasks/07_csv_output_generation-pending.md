### Task 7: CSV output generation

- **Objective:** Generate total_YYYY_MM_DD.csv and write per-client invoice CSV files
- **Implementation:** TotalCSVBuilder: single sheet grouped by client, subtotals, flag/warning columns. ClientCSVWriter: opens template, locates date row + line items table + total row by structural scanning, writes data. OutputZipper: assembles final ZIP. All registered in container. Unit tests with fixture templates
- **Demo:** Unit tests confirm correct CSV values; warnings appear as flag columns in output