import { CSVParser } from './CSVParser';
import { mapClientRow } from './mappers';
import { IClientRow } from './types';

export class ClientsParser {
  async parse(filePath: string): Promise<IClientRow[]> {
    const raw = await new CSVParser<Record<string, string>>().parse(filePath);
    return raw.map(mapClientRow);
  }
}
