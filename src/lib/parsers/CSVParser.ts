import fs from 'fs';
import csv from 'csv-parser';

export abstract class CSVParser<T> {
  /**
   * Parses a CSV file and returns an array of objects of type T.
   * @param filePath The path to the CSV file.
   * @returns A promise that resolves to an array of objects of type T.
   */
  async parse(filePath: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const results: T[] = [];
      if (!fs.existsSync(filePath)) {
        return reject(new Error(`File not found: ${filePath}`));
      }

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data: T) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error: Error) => reject(error));
    });
  }
}
