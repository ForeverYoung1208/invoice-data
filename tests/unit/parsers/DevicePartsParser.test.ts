import { DevicePartsParser } from '../../../src/lib/parsers/DevicePartsParser';
import path from 'path';

describe('DevicePartsParser', () => {
  let parser: DevicePartsParser;

  beforeEach(() => {
    parser = new DevicePartsParser();
  });

  it('should parse a valid CSV file correctly', async () => {
    const filePath = path.join(__dirname, '../../../tests/fixtures/mock-data/devices.csv');
    const results = await parser.parse(filePath);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]['Бренд']).toBe('ASUS');
  });

  it('should throw an error if the file does not exist', async () => {
    const filePath = path.join(__dirname, '../../../non_existent_file.csv');
    await expect(parser.parse(filePath)).rejects.toThrow('File not found');
  });
});
