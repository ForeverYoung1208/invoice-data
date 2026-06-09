import path from 'path';
import { JobsParser } from '../../../src/lib/parsers/JobsParser';

describe('JobsParser', () => {
  let parser: JobsParser;

  beforeEach(() => {
    parser = new JobsParser();
  });

  it('parses a valid CSV and maps to English keys', async () => {
    const filePath = path.join(__dirname, '../../../tests/fixtures/mock-data/jobs.csv');
    const results = await parser.parse(filePath);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('jobNumber');
    expect(results[0].jobNumber).toBe('З-2026-0147');
    expect(results[0].clientName).toBe('Коваленко О.В.');
  });

  it('returns an empty array for an empty file', async () => {
    const filePath = path.join(__dirname, '../../../tests/fixtures/edge_cases/empty_jobs.csv');
    const results = await parser.parse(filePath);
    expect(results).toEqual([]);
  });

  it('returns an empty array for a headers-only file', async () => {
    const filePath = path.join(__dirname, '../../../tests/fixtures/edge_cases/headers_only_jobs.csv');
    const results = await parser.parse(filePath);
    expect(results).toEqual([]);
  });

  it('throws if the file does not exist', async () => {
    await expect(parser.parse('/non_existent_file.csv')).rejects.toThrow('File not found');
  });
});
