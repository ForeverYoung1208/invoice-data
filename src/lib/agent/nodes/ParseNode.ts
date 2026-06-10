import { Logger } from '../../logger';
import { ETaskFileRole } from '../../constants';
import { ClientsParser } from '../../parsers/ClientsParser';
import { DevicePartsParser } from '../../parsers/DevicePartsParser';
import { JobsParser } from '../../parsers/JobsParser';
import { PartsParser } from '../../parsers/PartsParser';
import {
  IBaseNode,
  IAgentTaskFileRef,
  TInvoiceAgentState,
} from '../state/annotation';

export class ParseNode implements IBaseNode {
  private readonly logger = new Logger('ParseNode');
  async execute(
    state: TInvoiceAgentState,
  ): Promise<Partial<TInvoiceAgentState>> {
    const find = (role: ETaskFileRole): IAgentTaskFileRef | undefined =>
      state.taskFiles.find((f) => f.role === role);

    const jobsFile = find(ETaskFileRole.JOBS);
    const clientsFile = find(ETaskFileRole.CLIENTS);
    const partsFile = find(ETaskFileRole.PARTS);
    const devicesFile = find(ETaskFileRole.DEVICES);

    const missing = [
      !jobsFile && ETaskFileRole.JOBS,
      !clientsFile && ETaskFileRole.CLIENTS,
      !partsFile && ETaskFileRole.PARTS,
      !devicesFile && ETaskFileRole.DEVICES,
    ].filter(Boolean) as ETaskFileRole[];

    if (missing.length > 0) {
      return { errors: missing.map((r) => `Missing file for role: ${r}`) };
    }

    let jobs, clients, parts, devices;
    try {
      [jobs, clients, parts, devices] = await Promise.all([
        new JobsParser().parse(jobsFile!.filePath),
        new ClientsParser().parse(clientsFile!.filePath),
        new PartsParser().parse(partsFile!.filePath),
        new DevicePartsParser().parse(devicesFile!.filePath),
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { errors: [`ParseNode: failed to read CSV files: ${msg}`] };
    }

    const empty = [
      jobs.length === 0 && 'jobs',
      clients.length === 0 && 'clients',
      parts.length === 0 && 'parts',
      devices.length === 0 && 'devices',
    ].filter(Boolean) as string[];

    this.logger.info(
      `jobs=${jobs.length} clients=${clients.length} parts=${parts.length} devices=${devices.length}`,
    );

    if (empty.length > 0) {
      return { errors: empty.map((name) => `Empty file: ${name}`) };
    }

    return { jobs, clients, parts, devices };
  }
}
