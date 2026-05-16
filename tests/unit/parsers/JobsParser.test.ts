import { JobsParser } from '../../../src/lib/parsers/JobsParser';
import path from 'path';
import fs from 'fs';

describe('JobsParser', () => {
  let parser: JobsParser;

  beforeEach(() => {
    parser = new JobsParser();
  });

  it('should parse a valid CSV file correctly', async () => {
    const filePath = path.join(__dirname, '../../../tests/fixtures/mock-data/jobs.csv');
    const results = await parser.parse(filePath);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('№ заявки');
    expect(results[0]['№ заявки']).toBe('З-2026-0147');
  });

  it('should return an empty array for an empty file', async () => {
    const filePath = path.join(__dirname, '../../../tests/fixtures/edge_cases/empty_jobs.csv');
    const results = await parser.parse(filePath);
    expect(results).toEqual([]);
  });

  it('should return an empty array for a file with only headers', async () => {
    const filePath = path.join(__dirname, '../../../tests/fixtures/edge_cases/headers_only_jobs.csv');
    const results = await parser.parse(filePath);
    expect(results).toEqual([]);
  });

  it('should handle malformed rows by providing partial objects', async () => {
    const filePath = path.join(__dirname, '../../../tests/fixtures/edge_cases/malformed_jobs.csv');
    const results = await parser.parse(filePath);
    expect(results.length).toBe(1);
    expect(results[0]['№ заявки']).toBe('З-2026-0147');
    expect(results[0]['Дата прийому']).toBe('2026-05-10');
    // Other properties should be undefined
    expect(results[0]['Прізвище клієнта']).toBeUndefined();
  });

  it('should throw an error if the file does not exist', async () => {
    const filePath = path.join(__dirname, '../../../non_existent_file.csv');
    await expect(parser.parse(filePath)).rejects.toThrow('File not found');
  });
});
