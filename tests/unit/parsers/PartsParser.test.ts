import { PartsParser } from '../../../src/lib/parsers/PartsParser';
import path from 'path';

describe('PartsParser', () => {
  let parser: PartsParser;

  beforeEach(() => {
    parser = new PartsParser();
  });

  it('should parse a valid CSV file correctly', async () => {
    const filePath = path.join(__dirname, '../../../tests/fixtures/mock-data/parts.csv');
    const results = await parser.parse(filePath);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]['Артикул']).toBe('ЗЧ-БЖ-001');
  });

  it('should throw an error if the file does not exist', async () => {
    const filePath = path.join(__dirname, '../../../non_existent_file.csv');
    await expect(parser.parse(filePath)).rejects.toThrow('File not found');
  });
});
