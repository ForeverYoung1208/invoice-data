import path from 'path';
import { PartsParser } from '../../../src/lib/parsers/PartsParser';

describe('PartsParser', () => {
  let parser: PartsParser;

  beforeEach(() => {
    parser = new PartsParser();
  });

  it('parses a valid CSV and maps to English keys', async () => {
    const filePath = path.join(__dirname, '../../../tests/fixtures/mock-data/parts.csv');
    const results = await parser.parse(filePath);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].partId).toBe('ЗЧ-БЖ-001');
    expect(results[0]).toHaveProperty('salePrice');
    expect(results[0]).toHaveProperty('inStock');
  });

  it('throws if the file does not exist', async () => {
    await expect(parser.parse('/non_existent_file.csv')).rejects.toThrow('File not found');
  });
});
