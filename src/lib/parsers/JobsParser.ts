import { CSVParser } from './CSVParser';
import { mapJobRow } from './mappers';
import { IJobRow } from './types';

export class JobsParser {
  async parse(filePath: string): Promise<IJobRow[]> {
    const raw = await new CSVParser<Record<string, string>>().parse(filePath);
    return raw.map(mapJobRow);
  }
}
