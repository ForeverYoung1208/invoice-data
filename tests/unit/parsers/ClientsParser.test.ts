import path from 'path';
import { ClientsParser } from '../../../src/lib/parsers/ClientsParser';

describe('ClientsParser', () => {
  let parser: ClientsParser;

  beforeEach(() => {
    parser = new ClientsParser();
  });

  it('parses a valid CSV and maps to English keys', async () => {
    const filePath = path.join(__dirname, '../../../tests/fixtures/mock-data/clients.csv');
    const results = await parser.parse(filePath);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].clientId).toBe('КЛ-001');
    expect(results[0]).toHaveProperty('fullName');
  });

  it('throws if the file does not exist', async () => {
    await expect(parser.parse('/non_existent_file.csv')).rejects.toThrow('File not found');
  });
});
