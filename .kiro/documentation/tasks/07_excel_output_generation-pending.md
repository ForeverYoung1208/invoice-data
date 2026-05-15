### Task 7: Excel output generation

- **Objective:** Generate total_YYYY_MM_DD.xlsx and fill per-client invoice templates
- **Implementation:** TotalSheetBuilder: single sheet grouped by client, subtotals, Excel cell comments for flags/warnings. ClientTemplateWriter: opens template, locates date cell + line items table + total row by structural scanning, writes data. OutputZipper: assembles final ZIP. All registered in container. Unit tests with fixture templates
- **Demo:** Unit tests confirm correct cell values; warnings appear as Excel cell comments