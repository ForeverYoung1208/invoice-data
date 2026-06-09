import { CSVParser } from './CSVParser';
import { mapPartRow } from './mappers';
import { IPartRow } from './types';

export class PartsParser {
  async parse(filePath: string): Promise<IPartRow[]> {
    const raw = await new CSVParser<Record<string, string>>().parse(filePath);
    return raw.map(mapPartRow);
  }
}
