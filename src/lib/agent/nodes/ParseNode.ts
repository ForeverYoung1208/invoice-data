import { join } from 'path';
import { Logger } from '../../logger';
import { ConfigService } from '../../services/ConfigService';
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
  constructor(private readonly configService: ConfigService) {}

  async execute(
    state: TInvoiceAgentState,
  ): Promise<Partial<TInvoiceAgentState>> {
    const { dataDir } = this.configService.getConfig();
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

    // Compose full file paths by joining dataDir with each file's fileName
    const composePath = (ref: IAgentTaskFileRef): string =>
      join(dataDir, ref.fileName);

    let jobs, clients, parts, devices;
    try {
      [jobs, clients, parts, devices] = await Promise.all([
        new JobsParser().parse(composePath(jobsFile!)),
        new ClientsParser().parse(composePath(clientsFile!)),
        new PartsParser().parse(composePath(partsFile!)),
        new DevicePartsParser().parse(composePath(devicesFile!)),
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
