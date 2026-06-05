import { readFileSync, writeFileSync } from 'fs';

import { IClientInvoiceData } from './types';

/**
 * Writes invoice data into a client CSV template by scanning for
 * structural markers (date row, line items table, total row).
 *
 * The template is expected to contain placeholder markers that are
 * replaced with actual data. Unmatched rows in the line items table
 * are preserved, new rows are inserted, and placeholders are filled.
 */
export class ClientCSVWriter {
  // ─── Structural markers ───────────────────────────────────────────────────

  /** Marker for the invoice date row */
  private static readonly DATE_MARKER = 'TEMPLATE_DATE';

  /** Marker for the client name row */
  private static readonly CLIENT_NAME_MARKER = 'TEMPLATE_CLIENT_NAME';

  /** Marker for the client address row */
  private static readonly ADDRESS_MARKER = 'TEMPLATE_CLIENT_ADDRESS';

  /** Marker for the client phone row */
  private static readonly PHONE_MARKER = 'TEMPLATE_CLIENT_PHONE';

  /** Marker for the client email row */
  private static readonly EMAIL_MARKER = 'TEMPLATE_CLIENT_EMAIL';

  /** Marker for the line items total row */
  private static readonly LINE_TOTAL_MARKER = 'TEMPLATE_LINE_TOTAL';

  /** Marker for the grand total row */
  private static readonly GRAND_TOTAL_MARKER = 'TEMPLATE_GRAND_TOTAL';

  /** Marker for the notes row */
  private static readonly NOTES_MARKER = 'TEMPLATE_NOTES';

  // ─── Template scanning ────────────────────────────────────────────────────

  /**
   * Parse the template CSV into lines for scanning.
   */
  private parseTemplate(templatePath: string): string[] {
    const content = readFileSync(templatePath, 'utf-8');
    return content.split(/\r?\n/);
  }

  /**
   * Scan the template lines to find structural sections.
   *
   * Returns indices for:
   * - dateRow: the row containing the date marker
   * - clientRows: rows containing client info markers
   * - headerRow: the line items table header row
   * - lineTotalRow: the row containing the line total marker
   * - grandTotalRow: the row containing the grand total marker
   * - notesRow: the row containing the notes marker
   */
  private scanTemplate(lines: string[]): {
    dateRow: number;
    clientRows: Map<number, string>;
    headerRow: number;
    lineTotalRow: number;
    grandTotalRow: number;
    notesRow: number;
  } {
    const result = {
      dateRow: -1,
      clientRows: new Map<number, string>(),
      headerRow: -1,
      lineTotalRow: -1,
      grandTotalRow: -1,
      notesRow: -1,
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.includes(ClientCSVWriter.DATE_MARKER)) {
        result.dateRow = i;
      }

      // Check for client info markers
      for (const [marker, key] of [
        [ClientCSVWriter.CLIENT_NAME_MARKER, 'clientName'],
        [ClientCSVWriter.ADDRESS_MARKER, 'address'],
        [ClientCSVWriter.PHONE_MARKER, 'phone'],
        [ClientCSVWriter.EMAIL_MARKER, 'email'],
      ] as const) {
        if (line.includes(marker)) {
          result.clientRows.set(i, key);
        }
      }

      // Find the line items header row (contains №, Пристрій, Модель, etc.)
      if (
        line.includes('№') &&
        line.includes('Пристрій') &&
        line.includes('Назва деталі')
      ) {
        result.headerRow = i;
      }

      if (line.includes(ClientCSVWriter.LINE_TOTAL_MARKER)) {
        result.lineTotalRow = i;
      }

      if (line.includes(ClientCSVWriter.GRAND_TOTAL_MARKER)) {
        result.grandTotalRow = i;
      }

      if (line.includes(ClientCSVWriter.NOTES_MARKER)) {
        result.notesRow = i;
      }
    }

    return result;
  }

  /**
   * Generate the line items table rows for a client.
   */
  private buildLineItems(invoiceData: IClientInvoiceData): string[] {
    const items: string[] = [];
    let itemNumber = 0;

    for (const job of invoiceData.matchedJobs) {
      if (job.matchedParts.length === 0) {
        continue;
      }

      for (const part of job.matchedParts) {
        itemNumber++;
        const partsTotal = part.price * part.quantity;

        // Build a note column if there are flags or comments
        let note = '';
        if (part.isUncertain) {
          note += '⚠️ Невпевнено';
        }
        if (part.warningLevel === 1) {
          note += (note ? '; ' : '') + '❌ Несумісність';
        } else if (part.warningLevel === 0.5) {
          note += (note ? '; ' : '') + '⚠️ Не рекомендовано';
        }
        if (part.comment) {
          note += (note ? '; ' : '') + part.comment;
        }

        items.push(
          [
            String(itemNumber),
            job.deviceType,
            job.deviceModel,
            job.faultDescription,
            job.jobNumber,
            part.partId,
            part.partName,
            part.category,
            String(part.price),
            String(part.quantity),
            String(partsTotal),
            note,
          ]
            .join(',')
            .replace(/"/g, '""'),
        );
      }
    }

    return items;
  }

  /**
   * Replace placeholders in template lines with actual data.
   */
  private replacePlaceholders(
    lines: string[],
    structure: NonNullable<ReturnType<ClientCSVWriter['scanTemplate']>>,
    invoiceData: IClientInvoiceData,
  ): string[] {
    const result = [...lines];

    // Replace date
    if (structure.dateRow >= 0) {
      result[structure.dateRow] = `Дата:,,${invoiceData.invoiceDate}`;
    }

    // Replace client info
    for (const [rowIndex, key] of structure.clientRows) {
      switch (key) {
        case 'clientName':
          result[rowIndex] = `Клієнт:,,${invoiceData.clientName}`;
          break;
        case 'address':
          result[rowIndex] = `Адреса:,,${invoiceData.address}`;
          break;
        case 'phone':
          result[rowIndex] = `Телефон:,,${invoiceData.phone}`;
          break;
        case 'email':
          result[rowIndex] = `Email:,,${invoiceData.email}`;
          break;
      }
    }

    // Replace notes FIRST (before inserting line items, which shifts indices)
    if (structure.notesRow >= 0) {
      const notesText =
        invoiceData.allNotes.length > 0
          ? invoiceData.allNotes.join('; ')
          : 'Зауважень немає';
      result[structure.notesRow] = `Примітки: ${notesText}`;
    }

    // Replace line items - insert new rows after header
    if (structure.headerRow >= 0) {
      const newItems = this.buildLineItems(invoiceData);
      const lineTotalValue = String(
        invoiceData.matchedJobs.reduce((s, j) => s + j.matchedTotal, 0),
      );
      const grandTotalValue = String(invoiceData.grandTotal);

      if (structure.lineTotalRow >= 0) {
        result[structure.lineTotalRow] = `,,,,,,Всього:,,${lineTotalValue}`;
      }

      if (structure.grandTotalRow >= 0) {
        result[structure.grandTotalRow] = `,,,,,,Разом:,,${grandTotalValue}`;
      }

      if (newItems.length > 0) {
        for (let i = newItems.length - 1; i >= 0; i--) {
          result.splice(structure.headerRow + 1, 0, newItems[i]);
        }
      }
    }

    return result;
  }

  /**
   * Generate a client invoice CSV from a template.
   *
   * @param templatePath Path to the invoice template CSV file
   * @param invoiceData The invoice data to fill in
   * @returns The generated invoice CSV content as a string
   */
  generate(templatePath: string, invoiceData: IClientInvoiceData): string {
    const lines = this.parseTemplate(templatePath);
    const structure = this.scanTemplate(lines);
    const filledLines = this.replacePlaceholders(lines, structure, invoiceData);
    return filledLines.join('\n') + '\n';
  }

  /**
   * Write a client invoice CSV to a file.
   *
   * @param templatePath Path to the invoice template CSV file
   * @param invoiceData The invoice data to fill in
   * @param outputPath Path to write the generated invoice to
   * @returns The output file path
   */
  writeToFile(
    templatePath: string,
    invoiceData: IClientInvoiceData,
    outputPath: string,
  ): string {
    const content = this.generate(templatePath, invoiceData);
    writeFileSync(outputPath, content, 'utf-8');
    return outputPath;
  }

  /**
   * Generate a unique file name for a client invoice.
   * Format: invoice_CLIENT_NAME_YYYY_MM_DD.csv
   */
  static fileName(clientName: string, date: string): string {
    const d = new Date(date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');

    // Sanitize client name for file system
    const sanitized = clientName
      .replace(/[^a-zA-Z0-9а-яА-ЯіІєЄїЇґҐ \-_]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 30);

    return `invoice_${sanitized}_${yyyy}_${mm}_${dd}.csv`;
  }
}
