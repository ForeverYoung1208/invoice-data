import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import archiver from 'archiver';

import { OutputData, ClientInvoiceData } from './types';
import { TotalSheetBuilder } from './TotalSheetBuilder';
import { ClientCSVWriter } from './ClientCSVWriter';

/**
 * Assembles the final ZIP archive containing:
 * - total_YYYY_MM_DD.csv (summary sheet grouped by client)
 * - Per-client invoice CSV files
 *
 * The ZIP is written to disk and the path is returned.
 */
export class OutputZipper {
  /** The path to the generated ZIP file */
  zipPath: string | null = null;

  /**
   * Generate a unique file name for the output ZIP.
   * Format: invoices_YYYY_MM_DD.zip
   */
  private static zipFileName(date: string): string {
    const d = new Date(date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `invoices_${yyyy}_${mm}_${dd}.zip`;
  }

  /**
   * Assemble and write the ZIP file.
   *
   * @param data The complete output data
   * @param clientInvoices Client invoice data (already prepared)
   * @param outputDir Directory to write the ZIP to
   * @param templatePath Path to the invoice template (used for generating invoices)
   * @param clientsFilePath Optional path to clients CSV for name resolution in the total sheet
   * @returns The path to the generated ZIP file
   */
  async assemble(
    data: OutputData,
    clientInvoices: ClientInvoiceData[],
    outputDir: string,
    templatePath: string,
    clientsFilePath?: string,
  ): Promise<string> {
    const fileName = OutputZipper.zipFileName(data.generationDate);
    this.zipPath = join(outputDir, fileName);

    // Ensure output directory exists
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      if (!this.zipPath) {
        return reject(new Error('ZIP path is not set'));
      }
      const output = createWriteStream(this.zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        resolve(this.zipPath!);
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);

      // 1. Add total sheet
      const totalBuilder = new TotalSheetBuilder();
      const totalSheetContent = totalBuilder.build(data, clientsFilePath);
      const totalFileName = TotalSheetBuilder.fileName(data.generationDate);
      archive.append(totalSheetContent, { name: totalFileName });

      // 2. Add per-client invoice CSVs
      const writer = new ClientCSVWriter();
      for (const invoice of clientInvoices) {
        const content = writer.generate(templatePath, invoice);
        const clientFileName = ClientCSVWriter.fileName(
          invoice.clientName,
          data.generationDate,
        );
        archive.append(content, { name: clientFileName });
      }

      void archive.finalize();
    });
  }

  /**
   * Get the path to the assembled ZIP file.
   */
  getPath(): string | null {
    return this.zipPath;
  }
}
