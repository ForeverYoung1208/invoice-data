import { CSVParser } from './CSVParser';
import { mapDevicePartRow } from './mappers';
import { IDevicePartRow } from './types';

export class DevicePartsParser {
  async parse(filePath: string): Promise<IDevicePartRow[]> {
    const raw = await new CSVParser<Record<string, string>>().parse(filePath);
    return raw.map(mapDevicePartRow);
  }
}
