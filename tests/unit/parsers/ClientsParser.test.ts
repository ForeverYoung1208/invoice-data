import { ClientsParser } from '../../../src/lib/parsers/ClientsParser';
import path from 'path';

describe('ClientsParser', () => {
  let parser: ClientsParser;

  beforeEach(() => {
    parser = new ClientsParser();
  });

  it('should parse a valid CSV file correctly', async () => {
    const filePath = path.join(
      __dirname,
      '../../../tests/fixtures/mock-data/clients.csv',
    );
    const results = await parser.parse(filePath);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]['ID клієнта']).toBe('КЛ-001');
  });

  it('should throw an error if the file does not exist', async () => {
    const filePath = path.join(__dirname, '../../../non_existent_file.csv');
    await expect(parser.parse(filePath)).rejects.toThrow('File not found');
  });
});
