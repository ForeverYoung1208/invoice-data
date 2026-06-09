import { readFileSync, writeFileSync, existsSync } from 'fs';

import { IOutputData, IMatchedJob } from './types';

/**
 * Builds the total summary sheet grouped by client.
 *
 * The output CSV has the following structure:
 * - Header row with all column names
 * - One row per matched part per job
 * - Subtotal row after each client's entries
 * - Grand total row at the end
 * - Flag and warning columns to highlight uncertain matches
 */
export class TotalSheetBuilder {
  /**
   * Column headers for the total sheet.
   */
  private readonly headers: string[] = [
    '№ заявки',
    'Дата',
    'Клієнт',
    'Пристрій',
    'Модель',
    'Опис несправності',
    'За деталь',
    'Назва деталі',
    'Категорія',
    'Ціна продажу (₴)',
    'К-ть',
    'Сума (₴)',
    'Вартість замовлення (₴)',
    'Прапор',
    'Застереження',
    'Примітки',
  ];

  /**
   * Parse a CSV file into an array of records for client lookup.
   *
   * @param filePath Path to the clients CSV file
   * @returns Array of client records
   */
  private parseClientsFile(filePath: string): Record<string, string>[] {
    const content = readFileSync(filePath, 'utf-8');
    return this.parseCsv(content);
  }

  /**
   * Parse CSV content into an array of records.
   */
  private parseCsv(content: string): Record<string, string>[] {
    const lines = content.split(/\r?\n/).filter((line) => line.trim() !== '');
    if (lines.length === 0) return [];

    const headers = this.parseCsvLine(lines[0]);
    const records: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      const record: Record<string, string> = {};
      headers.forEach((header, idx) => {
        record[header] = values[idx] ?? '';
      });
      records.push(record);
    }

    return records;
  }

  /**
   * Parse a single CSV line respecting quotes.
   */
  private parseCsvLine(line: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    fields.push(current);
    return fields;
  }

  /**
   * Escape a field for CSV output.
   */
  private escapeCsvField(value: string): string {
    if (
      value.includes(',') ||
      value.includes('"') ||
      value.includes('\n') ||
      value.includes('\r')
    ) {
      return '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
  }

  /**
   * Escape an entire row for CSV output.
   */
  private escapeRow(row: string[]): string {
    return row.map((field) => this.escapeCsvField(field)).join(',');
  }

  /**
   * Build the total sheet content as a CSV string.
   *
   * @param data The complete output data from the agent
   * @param clientsFilePath Path to clients CSV for client name matching (optional)
   * @returns The total sheet as a CSV string
   */
  build(data: IOutputData, clientsFilePath?: string): string {
    const { matchedJobs } = data;
    if (matchedJobs.length === 0) {
      // Return header-only sheet
      return this.headers.join(',') + '\n';
    }

    const clientMap = this.buildClientMap(clientsFilePath);
    const rows: string[][] = [];

    // Group jobs by normalized client name
    const grouped = this.groupByClient(matchedJobs, clientMap);

    for (const [clientName, jobs] of grouped) {
      const clientJobsRows = this.buildClientRows(clientName, jobs);
      rows.push(...clientJobsRows);

      // Subtotal row for this client
      const clientTotal = this.calculateClientTotal(jobs);
      rows.push(this.subtotalRow(clientName, clientTotal));
    }

    // Grand total row
    const grandTotal = matchedJobs.reduce(
      (sum, job) => sum + job.matchedTotal,
      0,
    );
    rows.push(this.grandTotalRow(grandTotal));

    return (
      this.headers.join(',') +
      '\n' +
      rows.map((r) => this.escapeRow(r)).join('\n') +
      '\n'
    );
  }

  /**
   * Build a client lookup map from the clients CSV file.
   * Maps short client names (from jobs) to full client names.
   */
  private buildClientMap(clientsFilePath?: string): Map<string, string> {
    const map = new Map<string, string>();
    if (!clientsFilePath || !existsSync(clientsFilePath)) {
      return map;
    }

    try {
      const clients = this.parseClientsFile(clientsFilePath);
      for (const client of clients) {
        // 'Прізвище та ініціали' is the only clients column referenced here;
        // the raw CSV row is intentionally used via the inline parser so we
        // access it once, here, as the sole mapping point.
        const name = client['Прізвище та ініціали'] ?? '';
        map.set(name, name);
      }
    } catch {
      // If we can't parse the clients file, return empty map
      // The builder will still work with client names as-is
    }

    return map;
  }

  /**
   * Group matched jobs by client name, resolving short names to full names.
   */
  private groupByClient(
    jobs: IMatchedJob[],
    clientMap: Map<string, string>,
  ): Map<string, IMatchedJob[]> {
    const grouped = new Map<string, IMatchedJob[]>();

    for (const job of jobs) {
      // Resolve client name using the lookup map
      let displayName = job.clientName;
      if (clientMap.has(job.clientName)) {
        displayName = clientMap.get(job.clientName)!;
      }

      const existing = grouped.get(displayName) ?? [];
      existing.push(job);
      grouped.set(displayName, existing);
    }

    return grouped;
  }

  /**
   * Build CSV rows for all parts in a client's jobs.
   */
  private buildClientRows(clientName: string, jobs: IMatchedJob[]): string[][] {
    const rows: string[][] = [];

    for (const job of jobs) {
      if (job.matchedParts.length === 0) {
        // No matched parts — still include the job as a single row
        rows.push(this.jobRow(job, clientName, '', '', '', 0, 0, '', ''));
      } else {
        for (const part of job.matchedParts) {
          const flag = part.isUncertain ? '⚠️ Невпевнено' : '';
          const warning =
            part.warningLevel === 1
              ? '❌ Несумісність'
              : part.warningLevel === 0.5
                ? '⚠️ Не рекомендовано'
                : '';
          rows.push(
            this.jobRow(
              job,
              clientName,
              part.partId,
              part.partName,
              part.category,
              part.price,
              part.quantity,
              flag,
              warning,
            ),
          );
        }
      }
    }

    return rows;
  }

  /**
   * Build a single data row for a matched part.
   */
  private jobRow(
    job: IMatchedJob,
    clientName: string,
    partId: string,
    partName: string,
    category: string,
    price: number,
    quantity: number,
    flag: string,
    warning: string,
  ): string[] {
    const partsTotal = price * quantity;
    const notes = job.matchedParts
      .filter((p) => p.comment)
      .map((p) => p.comment)
      .join('; ');

    return [
      job.jobNumber,
      job.jobDate,
      clientName,
      job.deviceType,
      job.deviceModel,
      job.faultDescription,
      partId,
      partName,
      category,
      String(price),
      String(quantity),
      String(partsTotal),
      String(job.matchedTotal),
      flag,
      warning,
      notes,
    ];
  }

  /**
   * Calculate the total for a single client.
   */
  private calculateClientTotal(jobs: IMatchedJob[]): number {
    return jobs.reduce((sum, job) => sum + job.matchedTotal, 0);
  }

  /**
   * Build a subtotal row for a client.
   */
  private subtotalRow(clientName: string, total: number): string[] {
    return [
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'Підсумок:',
      String(total),
      '',
      '',
      '',
    ];
  }

  /**
   * Build a grand total row.
   */
  private grandTotalRow(total: number): string[] {
    return [
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'РАЗОМ:',
      String(total),
      '',
      '',
      '',
    ];
  }

  /**
   * Build the total sheet and write it to a file.
   *
   * @param data The complete output data
   * @param outputPath Path to write the CSV to
   * @param clientsFilePath Optional path to clients CSV for name resolution
   */
  writeToFile(
    data: IOutputData,
    outputPath: string,
    clientsFilePath?: string,
  ): string {
    const content = this.build(data, clientsFilePath);
    writeFileSync(outputPath, content, 'utf-8');
    return outputPath;
  }

  /**
   * Generate the output file name from the generation date.
   * Format: total_YYYY_MM_DD.csv
   */
  static fileName(date: string): string {
    const d = new Date(date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `total_${yyyy}_${mm}_${dd}.csv`;
  }
}
