import path from 'path';
import { DevicePartsParser } from '../../../src/lib/parsers/DevicePartsParser';

describe('DevicePartsParser', () => {
  let parser: DevicePartsParser;

  beforeEach(() => {
    parser = new DevicePartsParser();
  });

  it('parses a valid CSV and maps to English keys', async () => {
    const filePath = path.join(__dirname, '../../../tests/fixtures/mock-data/devices.csv');
    const results = await parser.parse(filePath);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].brand).toBe('ASUS');
    expect(results[0]).toHaveProperty('typicalParts');
    expect(results[0]).toHaveProperty('blacklistedParts');
  });

  it('throws if the file does not exist', async () => {
    await expect(parser.parse('/non_existent_file.csv')).rejects.toThrow('File not found');
  });
});
